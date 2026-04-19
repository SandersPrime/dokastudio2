using System;
using System.IO;
using System.Runtime.InteropServices;

namespace VendorBridgeHelper
{
    public static class VendorInterop
    {
        [DllImport("kernel32", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern IntPtr LoadLibrary(string lpFileName);

        public static bool TryLoadLibrary(string dllPath, out string resolvedPath, out string error)
        {
            error = null;
            resolvedPath = null;

            if (string.IsNullOrWhiteSpace(dllPath))
            {
                error = "VENDOR_DLL_PATH is not set";
                return false;
            }

            resolvedPath = dllPath;
            if (!File.Exists(resolvedPath))
            {
                error = string.Format("DLL not found at {0}", resolvedPath);
                return false;
            }

            Console.WriteLine("[helper] dll loading: " + resolvedPath);
            var handle = LoadLibrary(resolvedPath);
            if (handle == IntPtr.Zero)
            {
                error = string.Format("LoadLibrary failed (code={0})", Marshal.GetLastWin32Error());
                Console.WriteLine("[helper] dll load failed: " + error);
                return false;
            }

            Console.WriteLine("[helper] dll loaded");
            return true;
        }
    }
}