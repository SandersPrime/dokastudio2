using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Web.Script.Serialization;

namespace VendorBridgeHelper
{
    internal static class Program
    {
        private static readonly JavaScriptSerializer Json = new JavaScriptSerializer();

        [STAThread]
        private static void Main()
        {
            Console.WriteLine("[helper] started");

            var port = Environment.GetEnvironmentVariable("VENDOR_HELPER_PORT") ?? "17610";
            var wsPath = Environment.GetEnvironmentVariable("VENDOR_HELPER_WS_PATH") ?? "/ws";
            var basePrefix = string.Format("http://127.0.0.1:{0}/", port);

            var health = new VendorHealthState
            {
                DllPath = Environment.GetEnvironmentVariable("VENDOR_DLL_PATH") ?? string.Empty,
                LastError = string.Empty
            };
            var device = new VendorDeviceInfo();
            var sockets = new List<WebSocket>();
            var sync = new object();

            string resolvedPath;
            string error;
            if (!VendorInterop.TryLoadLibrary(health.DllPath, out resolvedPath, out error))
            {
                health.DllLoaded = false;
                health.LastError = error ?? string.Empty;
            }
            else
            {
                health.DllLoaded = true;
                health.DllPath = resolvedPath;
            }

            var service = new BuzzerHalService(health, device);
            service.Initialize();
            service.OnButton += delegate(VendorButtonEvent evt)
            {
                var payload = new Dictionary<string, object>
                {
                    { "type", "vendor_button" },
                    { "receiverId", evt.ReceiverId },
                    { "buttonId", evt.ButtonId },
                    { "keyPad", evt.KeyPad },
                    { "pressedAt", evt.PressedAt.ToString("O") }
                };

                Console.WriteLine(string.Format(
                    "[helper] emitted vendor_button receiverId={0} buttonId={1}",
                    evt.ReceiverId,
                    evt.ButtonId));
                Broadcast(payload, sockets, sync);
            };

            var listener = new HttpListener();
            listener.Prefixes.Add(basePrefix);
            listener.Start();
            Console.WriteLine("[helper] listening on " + basePrefix);

            while (true)
            {
                var context = listener.GetContext();
                if (context.Request.IsWebSocketRequest && context.Request.Url != null &&
                    context.Request.Url.AbsolutePath == wsPath)
                {
                    HandleWebSocket(context, sockets, sync, device);
                    continue;
                }

                if (context.Request.HttpMethod == "GET" && context.Request.Url != null &&
                    context.Request.Url.AbsolutePath == "/health")
                {
                    WriteJson(context.Response, new
                    {
                        status = "ok",
                        version = "0.2.0",
                        dllLoaded = health.DllLoaded,
                        sdkInitialized = health.SdkInitialized,
                        connected = health.Connected,
                        lastError = health.LastError,
                        dllPath = health.DllPath
                    });
                    continue;
                }

                if (context.Request.HttpMethod == "GET" && context.Request.Url != null &&
                    context.Request.Url.AbsolutePath == "/devices")
                {
                    WriteJson(context.Response, new
                    {
                        devices = service.GetDevices()
                    });
                    continue;
                }

                if (context.Request.HttpMethod == "POST" && context.Request.Url != null &&
                    context.Request.Url.AbsolutePath == "/connect")
                {
                    var body = ReadBody(context.Request);
                    var request = Json.Deserialize<Dictionary<string, object>>(body ?? string.Empty);
                    var receiverId = (request != null && request.ContainsKey("receiverId"))
                        ? Convert.ToString(request["receiverId"])
                        : device.ReceiverId;

                    var ok = service.Connect("1-2000", 0, "");
                    if (ok)
                    {
                        Broadcast(new Dictionary<string, object>
                        {
                            { "type", "vendor_status" },
                            { "status", "connected" },
                            { "receiverId", receiverId },
                            { "timestamp", DateTimeOffset.UtcNow.ToString("O") }
                        }, sockets, sync);
                    }

                    WriteJson(context.Response, new { ok = ok });
                    continue;
                }

                if (context.Request.HttpMethod == "POST" && context.Request.Url != null &&
                    context.Request.Url.AbsolutePath == "/disconnect")
                {
                    var body = ReadBody(context.Request);
                    var request = Json.Deserialize<Dictionary<string, object>>(body ?? string.Empty);
                    var receiverId = (request != null && request.ContainsKey("receiverId"))
                        ? Convert.ToString(request["receiverId"])
                        : device.ReceiverId;

                    service.Disconnect();
                    Broadcast(new Dictionary<string, object>
                    {
                        { "type", "vendor_status" },
                        { "status", "disconnected" },
                        { "receiverId", receiverId },
                        { "timestamp", DateTimeOffset.UtcNow.ToString("O") }
                    }, sockets, sync);
                    WriteJson(context.Response, new { ok = true });
                    continue;
                }

                context.Response.StatusCode = 404;
                context.Response.Close();
            }
        }

        private static void HandleWebSocket(
            HttpListenerContext context,
            List<WebSocket> sockets,
            object sync,
            VendorDeviceInfo device)
        {
            var wsContext = context.AcceptWebSocketAsync(null).GetAwaiter().GetResult();
            var socket = wsContext.WebSocket;
            lock (sync)
            {
                sockets.Add(socket);
            }

            var payload = new Dictionary<string, object>
            {
                { "type", "vendor_status" },
                { "status", device.Status },
                { "receiverId", device.ReceiverId },
                { "timestamp", DateTimeOffset.UtcNow.ToString("O") }
            };
            Send(socket, payload);
        }

        private static void Broadcast(Dictionary<string, object> payload, List<WebSocket> sockets, object sync)
        {
            List<WebSocket> targets;
            lock (sync)
            {
                targets = sockets.FindAll(s => s.State == WebSocketState.Open);
            }

            foreach (var socket in targets)
            {
                Send(socket, payload);
            }
        }

        private static void Send(WebSocket socket, Dictionary<string, object> payload)
        {
            var json = Json.Serialize(payload);
            var buffer = Encoding.UTF8.GetBytes(json);
            socket.SendAsync(new ArraySegment<byte>(buffer), WebSocketMessageType.Text, true,
                System.Threading.CancellationToken.None).Wait();
        }

        private static void WriteJson(HttpListenerResponse response, object payload)
        {
            var json = Json.Serialize(payload);
            var buffer = Encoding.UTF8.GetBytes(json);
            response.ContentType = "application/json";
            response.ContentLength64 = buffer.Length;
            response.OutputStream.Write(buffer, 0, buffer.Length);
            response.OutputStream.Close();
        }

        private static string ReadBody(HttpListenerRequest request)
        {
            var reader = new StreamReader(request.InputStream, request.ContentEncoding);
            try
            {
                return reader.ReadToEnd();
            }
            finally
            {
                reader.Dispose();
            }
        }
    }
}