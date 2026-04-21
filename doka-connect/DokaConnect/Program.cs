using System;
using System.Collections.Generic;
using System.Windows.Forms;

namespace DokaConnect
{
    internal static class Program
    {
        private const string LogPrefix = "[doka-connect]";

        [STAThread]
        private static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            Log("started");

            var health = new VendorHealthState
            {
                DllPath = Environment.GetEnvironmentVariable("VENDOR_DLL_PATH") ?? string.Empty,
                LastError = string.Empty
            };

            string resolvedPath;
            string loadError;
            if (!Rf317Interop.TryLoadLibrary(health.DllPath, out resolvedPath, out loadError))
            {
                health.DllLoaded = false;
                health.LastError = loadError ?? string.Empty;
            }
            else
            {
                health.DllLoaded = true;
                health.DllPath = resolvedPath;
            }

            var rf317Device = new VendorDeviceInfo
            {
                ReceiverId = "rf317:primary",
                Name = "RF317 Receiver",
                Status = "disconnected"
            };
            var rf215Device = new VendorDeviceInfo
            {
                ReceiverId = "rf215:primary",
                Name = "RF215 Receiver",
                Status = "unavailable",
                StatusReason = "RF215 SDK not configured"
            };

            var rf317Service = new Rf317Service(health, rf317Device, Log);
            var rf215Service = new Rf215Service(health, rf215Device, Log);

            var services = new List<IReceiverService> { rf317Service, rf215Service };

            var form = new MainForm(services, health);
            var server = new HelperHttpServer(health, services, Log);

            foreach (var service in services)
            {
                service.OnButton += evt =>
                {
                    form.SetLastEvent(evt);
                    server.BroadcastButton(evt);
                };
                service.OnStatusChanged += () =>
                {
                    form.UpdateStatus();
                    server.BroadcastStatus(service);
                };
                service.OnLog += form.AppendLog;
            }

            server.Start();
            form.UpdateStatus();

            Application.ApplicationExit += (sender, args) =>
            {
                Log("shutdown requested");
                server.Stop();
            };

            Application.Run(form);
        }

        private static void Log(string message)
        {
            Console.WriteLine(string.Format("{0} {1}", LogPrefix, message));
        }
    }
}