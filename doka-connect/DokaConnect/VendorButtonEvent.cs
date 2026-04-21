using System;

namespace DokaConnect
{
    public class VendorButtonEvent
    {
        public string ReceiverId { get; set; }
        public string ButtonId { get; set; }
        public int KeyPad { get; set; }
        public DateTimeOffset PressedAt { get; set; }
    }
}