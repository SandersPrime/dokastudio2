namespace VendorBridgeHelper
{
    public class VendorDeviceInfo
    {
        public string ReceiverId { get; set; }
        public string Name { get; set; }
        public string Status { get; set; }
        public string StatusReason { get; set; }

        public VendorDeviceInfo()
        {
            ReceiverId = "rf317:primary";
            Name = "RF317 Receiver";
            Status = "disconnected";
        }
    }
}