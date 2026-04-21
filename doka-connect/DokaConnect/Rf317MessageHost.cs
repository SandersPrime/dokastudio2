using System.Windows.Forms;

namespace DokaConnect
{
    public sealed class Rf317MessageHost : Form
    {
        public Rf317MessageHost()
        {
            ShowInTaskbar = false;
            FormBorderStyle = FormBorderStyle.FixedToolWindow;
            WindowState = FormWindowState.Minimized;
            Load += delegate { Visible = false; };
        }
    }
}