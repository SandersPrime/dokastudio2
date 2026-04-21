using System.Windows.Forms;

namespace DokaConnect
{
    public sealed class Rf215MessageHost : Form
    {
        public Rf215MessageHost()
        {
            ShowInTaskbar = false;
            FormBorderStyle = FormBorderStyle.FixedToolWindow;
            WindowState = FormWindowState.Minimized;
            Load += delegate { Visible = false; };
        }
    }
}