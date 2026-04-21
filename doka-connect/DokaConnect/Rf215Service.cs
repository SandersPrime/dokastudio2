using System;
using System.Collections.Generic;

namespace DokaConnect
{
    public class Rf215Service : IReceiverService
    {
        private readonly VendorHealthState _health;
        private readonly VendorDeviceInfo _device;
        private readonly Action<string> _logger;

        public Rf215Service(VendorHealthState health, VendorDeviceInfo device, Action<string> logger)
        {
            _health = health;
            _device = device;
            _logger = logger;
        }

        public string Id => "rf215";
        public string Name => "RF215";
        public VendorDeviceInfo DeviceInfo => _device;
        public bool IsInitialized { get; private set; }
        public bool IsConnected { get; private set; }
        public bool IsReceiving { get; private set; }

        public event Action<VendorButtonEvent> OnButton;
        public event Action OnStatusChanged;
        public event Action<string> OnLog;

        public bool Initialize()
        {
            if (!Rf215Interop.IsAvailable())
            {
                _health.LastError = "RF215 SDK not configured";
                _device.Status = "unavailable";
                _device.StatusReason = _health.LastError;
                Log("rf215 sdk init skipped: " + _health.LastError);
                OnStatusChanged?.Invoke();
                return false;
            }

            IsInitialized = true;
            _device.Status = "disconnected";
            _device.StatusReason = null;
            Log("rf215 sdk init success");
            OnStatusChanged?.Invoke();
            return true;
        }

        public bool Connect(string receiverId)
        {
            Log("rf215 connect requested");
            _device.Status = "disconnected";
            _device.StatusReason = "RF215 connect not implemented";
            OnStatusChanged?.Invoke();
            return false;
        }

        public void Activate()
        {
            IsReceiving = true;
            Log("rf215 receiving active");
            OnStatusChanged?.Invoke();
        }

        public void Stop()
        {
            IsReceiving = false;
            Log("rf215 receiving stopped");
            OnStatusChanged?.Invoke();
        }

        public void Disconnect()
        {
            IsConnected = false;
            _device.Status = "disconnected";
            _device.StatusReason = null;
            Log("rf215 disconnect");
            OnStatusChanged?.Invoke();
        }

        public IList<VendorDeviceInfo> GetDevices()
        {
            return new List<VendorDeviceInfo> { _device };
        }

        private void Log(string message)
        {
            _logger?.Invoke(message);
            OnLog?.Invoke(string.Format("[doka-connect] {0}", message));
        }
    }
}