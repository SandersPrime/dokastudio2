using System;
using System.Collections.Generic;
using System.Threading;
using System.Windows.Forms;
using BuzzerHAL;

namespace DokaConnect
{
    public class Rf317Service : IReceiverService
    {
        // Current production path: uses BuzzerHAL SDK for RF317.
        // Do not remove/replace until a full direct SDK implementation is ready.
        private readonly VendorHealthState _health;
        private readonly VendorDeviceInfo _device;
        private readonly Action<string> _logger;
        private IBuzzerHAL _buzzer;
        private Rf317MessageHost _messageHost;
        private Thread _uiThread;
        private ManualResetEvent _uiReady;

        public Rf317Service(VendorHealthState health, VendorDeviceInfo device, Action<string> logger)
        {
            _health = health;
            _device = device;
            _logger = logger;
        }

        public string Id => "rf317";
        public string Name => "RF317";
        public VendorDeviceInfo DeviceInfo => _device;
        public bool IsInitialized { get; private set; }
        public bool IsConnected => _health.Connected;
        public bool IsReceiving { get; private set; }

        public event Action<VendorButtonEvent> OnButton;
        public event Action OnStatusChanged;
        public event Action<string> OnLog;

        public bool Initialize()
        {
            Log("rf317 sdk init started");
            try
            {
                _uiReady = new ManualResetEvent(false);
                _uiThread = new Thread(StartMessageLoop);
                _uiThread.IsBackground = true;
                _uiThread.SetApartmentState(ApartmentState.STA);
                _uiThread.Start();

                if (!_uiReady.WaitOne(TimeSpan.FromSeconds(5)))
                {
                    throw new InvalidOperationException("Message loop did not start");
                }

                _buzzer = Factory.Create(Device.EnjoyRF317, false, "");
                if (_buzzer == null)
                {
                    throw new InvalidOperationException("Factory.Create returned null");
                }

                _buzzer.OnBuzz += HandleBuzz;
                _buzzer.OnError += HandleError;
                _buzzer.OnConnectionFound += HandleConnectionFound;
                _buzzer.OnConnectionLost += HandleConnectionLost;
                _buzzer.OnQuizMasterRemotePressed += HandleQuizMaster;

                _health.SdkInitialized = true;
                IsInitialized = true;
                Log("rf317 sdk init success");
                OnStatusChanged?.Invoke();
                return true;
            }
            catch (Exception ex)
            {
                _health.SdkInitialized = false;
                _health.LastError = ex.Message;
                IsInitialized = false;
                Log("rf317 sdk init failed: " + ex.Message);
                OnStatusChanged?.Invoke();
                return false;
            }
        }

        public bool Connect(string receiverId)
        {
            if (_buzzer == null || _messageHost == null)
            {
                _health.LastError = "SDK not initialized";
                Log("connect failed: sdk not initialized");
                return false;
            }

            Log("connect started");
            try
            {
                bool result;
                if (_messageHost.InvokeRequired)
                {
                    result = (bool)_messageHost.Invoke(new Func<bool>(delegate
                    {
                        return _buzzer.Connect(_messageHost, "1-2000", 0, "");
                    }));
                }
                else
                {
                    result = _buzzer.Connect(_messageHost, "1-2000", 0, "");
                }
                _health.Connected = result;
                _device.Status = result ? "connected" : "disconnected";
                _device.StatusReason = result ? null : "Connect failed";
                Log(result ? "connect success" : "connect failed");
                OnStatusChanged?.Invoke();
                return result;
            }
            catch (Exception ex)
            {
                _health.Connected = false;
                _health.LastError = ex.Message;
                _device.Status = "unavailable";
                _device.StatusReason = ex.Message;
                Log("connect failed: " + ex.Message);
                OnStatusChanged?.Invoke();
                return false;
            }
        }

        public void Activate()
        {
            IsReceiving = true;
            Log("receiving active");
            OnStatusChanged?.Invoke();
        }

        public void Stop()
        {
            IsReceiving = false;
            Log("receiving stopped");
            OnStatusChanged?.Invoke();
        }

        public void Disconnect()
        {
            if (_buzzer == null)
            {
                return;
            }

            Log("disconnect requested");
            try
            {
                _buzzer.Disconnect();
            }
            catch (Exception ex)
            {
                _health.LastError = ex.Message;
                Log("disconnect failed: " + ex.Message);
            }
            finally
            {
                _health.Connected = false;
                _device.Status = "disconnected";
                _device.StatusReason = null;
                OnStatusChanged?.Invoke();
            }
        }

        public IList<VendorDeviceInfo> GetDevices()
        {
            return new List<VendorDeviceInfo> { _device };
        }

        private void HandleBuzz(int nKeyPad, ButtonStates state)
        {
            var buttonId = state.ToString();
            Log(string.Format("button event received keypad={0} state={1}", nKeyPad, state));
            OnButton?.Invoke(new VendorButtonEvent
            {
                ReceiverId = _device.ReceiverId,
                ButtonId = buttonId,
                KeyPad = nKeyPad,
                PressedAt = DateTimeOffset.UtcNow
            });
        }

        private void HandleError(string message)
        {
            _health.LastError = message;
            Log("rf317 sdk error: " + message);
        }

        private void HandleConnectionFound()
        {
            _health.Connected = true;
            _device.Status = "connected";
            _device.StatusReason = null;
            Log("receiver connected");
            OnStatusChanged?.Invoke();
        }

        private void HandleConnectionLost()
        {
            _health.Connected = false;
            _device.Status = "disconnected";
            Log("receiver disconnected");
            OnStatusChanged?.Invoke();
        }

        private void HandleQuizMaster()
        {
            Log("quiz master remote pressed");
        }

        private void StartMessageLoop()
        {
            _messageHost = new Rf317MessageHost();
            var handle = _messageHost.Handle;
            _uiReady.Set();
            Application.Run(_messageHost);
        }

        private void Log(string message)
        {
            _logger?.Invoke(message);
            OnLog?.Invoke(string.Format("[doka-connect] {0}", message));
        }
    }
}