using System;
using System.Collections.Generic;

namespace DokaConnect
{
    public interface IReceiverService
    {
        string Id { get; }
        string Name { get; }
        VendorDeviceInfo DeviceInfo { get; }
        bool IsInitialized { get; }
        bool IsConnected { get; }
        bool IsReceiving { get; }

        event Action<VendorButtonEvent> OnButton;
        event Action OnStatusChanged;
        event Action<string> OnLog;

        bool Initialize();
        bool Connect(string receiverId);
        void Activate();
        void Stop();
        void Disconnect();
        IList<VendorDeviceInfo> GetDevices();
    }
}