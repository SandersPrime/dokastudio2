namespace VendorBridgeHelper
{
    public class VendorHealthState
    {
        public bool DllLoaded { get; set; }
        public bool SdkInitialized { get; set; }
        public bool Connected { get; set; }
        public string LastError { get; set; }
        public string DllPath { get; set; }
    }
}