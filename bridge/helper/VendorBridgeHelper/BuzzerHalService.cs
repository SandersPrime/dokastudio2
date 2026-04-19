using System;
using System.Collections.Generic;
using System.Threading;
using System.Windows.Forms;
using BuzzerHAL;

namespace VendorBridgeHelper
{
    public class BuzzerHalService
    {
        private readonly VendorHealthState _health;
        private readonly VendorDeviceInfo _device;
        private IBuzzerHAL _buzzer;
        private HiddenMessageHost _messageHost;
        private Thread _uiThread;
        private ManualResetEvent _uiReady;

        public event Action<VendorButtonEvent> OnButton;

        public BuzzerHalService(VendorHealthState health, VendorDeviceInfo device)
        {
            _health = health;
            _device = device;
        }

        public void Initialize()
        {
            Console.WriteLine("[helper] sdk init started");
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
                Console.WriteLine("[helper] sdk init success");
            }
            catch (Exception ex)
            {
                _health.SdkInitialized = false;
                _health.LastError = ex.Message;
                Console.WriteLine("[helper] sdk init failed: " + ex);
            }
        }

        public bool Connect(string keypadString, int channel, string l)
        {
            if (_buzzer == null || _messageHost == null)
            {
                _health.LastError = "SDK not initialized";
                Console.WriteLine("[helper] connect failed: sdk not initialized");
                return false;
            }

            Console.WriteLine("[helper] connect started");
            try
            {
                bool result;
                if (_messageHost.InvokeRequired)
                {
                    result = (bool)_messageHost.Invoke(new Func<bool>(delegate
                    {
                        return _buzzer.Connect(_messageHost, keypadString, channel, l);
                    }));
                }
                else
                {
                    result = _buzzer.Connect(_messageHost, keypadString, channel, l);
                }
                _health.Connected = result;
                _device.Status = result ? "connected" : "disconnected";
                Console.WriteLine(result
                    ? "[helper] connect success"
                    : "[helper] connect failed");
                return result;
            }
            catch (Exception ex)
            {
                _health.Connected = false;
                _health.LastError = ex.Message;
                _device.Status = "unavailable";
                _device.StatusReason = ex.Message;
                Console.WriteLine("[helper] connect failed: " + ex);
                return false;
            }
        }

        public void Disconnect()
        {
            if (_buzzer == null)
            {
                return;
            }

            Console.WriteLine("[helper] disconnect requested");
            try
            {
                _buzzer.Disconnect();
            }
            catch (Exception ex)
            {
                _health.LastError = ex.Message;
                Console.WriteLine("[helper] disconnect failed: " + ex);
            }
            finally
            {
                _health.Connected = false;
                _device.Status = "disconnected";
            }
        }

        public IList<VendorDeviceInfo> GetDevices()
        {
            return new List<VendorDeviceInfo> { _device };
        }

        private void HandleBuzz(int nKeyPad, ButtonStates state)
        {
            var buttonId = MapButton(state);
            Console.WriteLine(string.Format("[helper] OnBuzz received keypad={0} state={1}", nKeyPad, state));
            var handler = OnButton;
            if (handler != null)
            {
                handler(new VendorButtonEvent
                {
                    ReceiverId = _device.ReceiverId,
                    ButtonId = buttonId,
                    KeyPad = nKeyPad,
                    PressedAt = DateTimeOffset.UtcNow
                });
            }
        }

        private void HandleError(string message)
        {
            _health.LastError = message;
            Console.WriteLine("[helper] OnError: " + message);
        }

        private void HandleConnectionFound()
        {
            _health.Connected = true;
            _device.Status = "connected";
            Console.WriteLine("[helper] OnConnectionFound");
        }

        private void HandleConnectionLost()
        {
            _health.Connected = false;
            _device.Status = "disconnected";
            Console.WriteLine("[helper] OnConnectionLost");
        }

        private void HandleQuizMaster()
        {
            Console.WriteLine("[helper] OnQuizMasterRemotePressed");
        }

        private static string MapButton(ButtonStates state)
        {
            var text = state.ToString();
            var known = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "RED", "A", "B", "C", "D", "E", "F"
            };

            return known.Contains(text) ? text : text;
        }

        private sealed class HiddenMessageHost : Form
        {
            public HiddenMessageHost()
            {
                ShowInTaskbar = false;
                FormBorderStyle = FormBorderStyle.FixedToolWindow;
                WindowState = FormWindowState.Minimized;
                Load += delegate { Visible = false; };
            }
        }

        private void StartMessageLoop()
        {
            _messageHost = new HiddenMessageHost();
            var handle = _messageHost.Handle;
            _uiReady.Set();
            Application.Run(_messageHost);
        }
    }

    public class VendorButtonEvent
    {
        public string ReceiverId { get; set; }
        public string ButtonId { get; set; }
        public int KeyPad { get; set; }
        public DateTimeOffset PressedAt { get; set; }

        public VendorButtonEvent()
        {
            ReceiverId = "rf317:primary";
            ButtonId = string.Empty;
        }
    }
}