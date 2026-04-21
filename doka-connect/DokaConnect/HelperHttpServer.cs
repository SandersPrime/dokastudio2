using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;

namespace DokaConnect
{
    public class HelperHttpServer
    {
        private readonly VendorHealthState _health;
        private readonly IList<IReceiverService> _services;
        private readonly Action<string> _logger;
        private readonly JavaScriptSerializer _json = new JavaScriptSerializer();
        private readonly List<WebSocket> _sockets = new List<WebSocket>();
        private readonly object _sync = new object();
        private readonly string _wsPath;
        private readonly string _basePrefix;
        private HttpListener _listener;
        private CancellationTokenSource _shutdown;

        public HelperHttpServer(VendorHealthState health, IList<IReceiverService> services, Action<string> logger)
        {
            _health = health;
            _services = services;
            _logger = logger;
            var port = Environment.GetEnvironmentVariable("VENDOR_HELPER_PORT") ?? "17610";
            _wsPath = Environment.GetEnvironmentVariable("VENDOR_HELPER_WS_PATH") ?? "/ws";
            _basePrefix = string.Format("http://127.0.0.1:{0}/", port);
        }

        public void Start()
        {
            _listener = new HttpListener();
            _listener.Prefixes.Add(_basePrefix);
            _shutdown = new CancellationTokenSource();
            try
            {
                _listener.Start();
                Log("http listener started on " + _basePrefix);
            }
            catch (Exception ex)
            {
                Log("http listener failed: " + ex.Message);
                return;
            }

            Task.Run(ListenLoop);
        }

        public void Stop()
        {
            if (_shutdown == null)
            {
                return;
            }

            _shutdown.Cancel();
            try
            {
                _listener?.Stop();
            }
            catch (Exception ex)
            {
                Log("http listener stop failed: " + ex.Message);
            }
            _listener?.Close();
        }

        public void BroadcastButton(VendorButtonEvent evt)
        {
            var payload = new Dictionary<string, object>
            {
                { "type", "vendor_button" },
                { "receiverId", evt.ReceiverId },
                { "buttonId", evt.ButtonId },
                { "keyPad", evt.KeyPad },
                { "pressedAt", evt.PressedAt.ToString("O") }
            };

            Log(string.Format("button event received receiverId={0} buttonId={1}", evt.ReceiverId, evt.ButtonId));
            Broadcast(payload);
        }

        public void BroadcastStatus(IReceiverService service)
        {
            var payload = new Dictionary<string, object>
            {
                { "type", "vendor_status" },
                { "status", service.DeviceInfo.Status },
                { "receiverId", service.DeviceInfo.ReceiverId },
                { "timestamp", DateTimeOffset.UtcNow.ToString("O") }
            };

            Broadcast(payload);
        }

        private void ListenLoop()
        {
            Log("http listener loop started");
            while (!_shutdown.IsCancellationRequested)
            {
                HttpListenerContext context;
                try
                {
                    context = _listener.GetContext();
                }
                catch (HttpListenerException)
                {
                    if (_shutdown.IsCancellationRequested)
                    {
                        break;
                    }
                    continue;
                }
                catch (ObjectDisposedException)
                {
                    break;
                }

                if (context.Request.IsWebSocketRequest && context.Request.Url != null &&
                    context.Request.Url.AbsolutePath == _wsPath)
                {
                    HandleWebSocket(context);
                    continue;
                }

                if (context.Request.HttpMethod == "GET" && context.Request.Url != null &&
                    context.Request.Url.AbsolutePath == "/health")
                {
                    WriteJson(context.Response, new
                    {
                        status = "ok",
                        version = "1.0.0",
                        dllLoaded = _health.DllLoaded,
                        sdkInitialized = _health.SdkInitialized,
                        connected = _health.Connected,
                        lastError = _health.LastError,
                        dllPath = _health.DllPath
                    });
                    continue;
                }

                if (context.Request.HttpMethod == "GET" && context.Request.Url != null &&
                    context.Request.Url.AbsolutePath == "/devices")
                {
                    var devices = new List<VendorDeviceInfo>();
                    foreach (var service in _services)
                    {
                        devices.AddRange(service.GetDevices());
                    }

                    WriteJson(context.Response, new
                    {
                        devices = devices
                    });
                    continue;
                }

                if (context.Request.HttpMethod == "POST" && context.Request.Url != null &&
                    context.Request.Url.AbsolutePath == "/connect")
                {
                    var request = ParseRequest<ConnectRequest>(context.Request);
                    var receiverId = request?.ReceiverId;
                    var service = ResolveService(receiverId);
                    var ok = service != null && service.Connect(receiverId ?? service.DeviceInfo.ReceiverId);
                    if (service != null)
                    {
                        BroadcastStatus(service);
                    }

                    WriteJson(context.Response, new { ok });
                    continue;
                }

                if (context.Request.HttpMethod == "POST" && context.Request.Url != null &&
                    context.Request.Url.AbsolutePath == "/disconnect")
                {
                    var request = ParseRequest<ConnectRequest>(context.Request);
                    var receiverId = request?.ReceiverId;
                    var service = ResolveService(receiverId);
                    service?.Disconnect();
                    if (service != null)
                    {
                        BroadcastStatus(service);
                    }

                    WriteJson(context.Response, new { ok = true });
                    continue;
                }

                context.Response.StatusCode = 404;
                context.Response.Close();
            }
        }

        private void HandleWebSocket(HttpListenerContext context)
        {
            var wsContext = context.AcceptWebSocketAsync(null).GetAwaiter().GetResult();
            var socket = wsContext.WebSocket;
            lock (_sync)
            {
                _sockets.Add(socket);
            }

            foreach (var service in _services)
            {
                Send(socket, new Dictionary<string, object>
                {
                    { "type", "vendor_status" },
                    { "status", service.DeviceInfo.Status },
                    { "receiverId", service.DeviceInfo.ReceiverId },
                    { "timestamp", DateTimeOffset.UtcNow.ToString("O") }
                });
            }
        }

        private void Broadcast(Dictionary<string, object> payload)
        {
            List<WebSocket> targets;
            lock (_sync)
            {
                targets = _sockets.FindAll(s => s.State == WebSocketState.Open);
            }

            foreach (var socket in targets)
            {
                Send(socket, payload);
            }
        }

        private void Send(WebSocket socket, Dictionary<string, object> payload)
        {
            var json = _json.Serialize(payload);
            var buffer = Encoding.UTF8.GetBytes(json);
            socket.SendAsync(new ArraySegment<byte>(buffer), WebSocketMessageType.Text, true,
                CancellationToken.None).Wait();
        }

        private void WriteJson(HttpListenerResponse response, object payload)
        {
            var json = _json.Serialize(payload);
            var buffer = Encoding.UTF8.GetBytes(json);
            response.ContentType = "application/json";
            response.ContentLength64 = buffer.Length;
            response.OutputStream.Write(buffer, 0, buffer.Length);
            response.OutputStream.Close();
        }

        private T ParseRequest<T>(HttpListenerRequest request) where T : class
        {
            using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
            {
                var body = reader.ReadToEnd();
                if (string.IsNullOrWhiteSpace(body))
                {
                    return null;
                }
                return _json.Deserialize<T>(body);
            }
        }

        private IReceiverService ResolveService(string receiverId)
        {
            foreach (var service in _services)
            {
                if (service.DeviceInfo != null &&
                    (string.IsNullOrEmpty(receiverId) || service.DeviceInfo.ReceiverId == receiverId))
                {
                    return service;
                }
            }
            return null;
        }

        private void Log(string message)
        {
            _logger?.Invoke(message);
        }
    }
}