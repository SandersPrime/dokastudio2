using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Windows.Forms;

namespace DokaConnect
{
    public class MainForm : Form
    {
        private readonly IList<IReceiverService> _services;
        private readonly VendorHealthState _health;
        private readonly Label _helperStatus;
        private readonly Label _sdkStatus;
        private readonly Label _receiverStatus;
        private readonly Label _receivingStatus;
        private readonly Label _lastKeypad;
        private readonly Label _lastButton;
        private readonly Label _lastTime;
        private readonly TextBox _logBox;
        private readonly ComboBox _receiverSelector;

        public MainForm(IList<IReceiverService> services, VendorHealthState health)
        {
            _services = services;
            _health = health;

            Text = "Doka Connect";
            Width = 900;
            Height = 700;
            StartPosition = FormStartPosition.CenterScreen;
            Font = new Font("Segoe UI", 10f, FontStyle.Regular);

            var layout = new TableLayoutPanel
            {
                Dock = DockStyle.Fill,
                ColumnCount = 1,
                RowCount = 5,
                Padding = new Padding(20),
                AutoSize = true
            };
            layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

            var header = new Label
            {
                Text = "Doka Connect",
                Font = new Font("Segoe UI", 20f, FontStyle.Bold),
                AutoSize = true
            };
            var subtitle = new Label
            {
                Text = "Подключение оборудования DokaStudio",
                Font = new Font("Segoe UI", 11f, FontStyle.Regular),
                AutoSize = true,
                ForeColor = Color.DimGray
            };
            layout.Controls.Add(header);
            layout.Controls.Add(subtitle);

            var statusGroup = new GroupBox
            {
                Text = "Статус",
                Dock = DockStyle.Top,
                AutoSize = true
            };
            var statusTable = new TableLayoutPanel
            {
                Dock = DockStyle.Fill,
                ColumnCount = 2,
                RowCount = 4,
                AutoSize = true
            };
            statusTable.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
            statusTable.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
            _helperStatus = AddStatusRow(statusTable, 0, "Helper running");
            _sdkStatus = AddStatusRow(statusTable, 1, "SDK initialized");
            _receiverStatus = AddStatusRow(statusTable, 2, "Receiver connected");
            _receivingStatus = AddStatusRow(statusTable, 3, "Receiving active");
            statusGroup.Controls.Add(statusTable);
            layout.Controls.Add(statusGroup);

            var controlGroup = new GroupBox
            {
                Text = "Управление",
                Dock = DockStyle.Top,
                AutoSize = true
            };
            var controlsPanel = new FlowLayoutPanel
            {
                Dock = DockStyle.Fill,
                AutoSize = true,
                WrapContents = true
            };

            _receiverSelector = new ComboBox
            {
                DropDownStyle = ComboBoxStyle.DropDownList,
                Width = 200
            };
            foreach (var service in _services)
            {
                _receiverSelector.Items.Add(service.DeviceInfo.ReceiverId);
            }
            if (_receiverSelector.Items.Count > 0)
            {
                _receiverSelector.SelectedIndex = 0;
            }

            controlsPanel.Controls.Add(_receiverSelector);
            controlsPanel.Controls.Add(CreateButton("Initialize", () => SelectedService()?.Initialize()));
            controlsPanel.Controls.Add(CreateButton("Connect", () =>
            {
                var service = SelectedService();
                service?.Connect(service.DeviceInfo.ReceiverId);
            }));
            controlsPanel.Controls.Add(CreateButton("Activate", () => SelectedService()?.Activate()));
            controlsPanel.Controls.Add(CreateButton("Stop", () => SelectedService()?.Stop()));
            controlsPanel.Controls.Add(CreateButton("Disconnect", () => SelectedService()?.Disconnect()));
            controlGroup.Controls.Add(controlsPanel);
            layout.Controls.Add(controlGroup);

            var lastGroup = new GroupBox
            {
                Text = "Последнее событие",
                Dock = DockStyle.Top,
                AutoSize = true
            };
            var lastTable = new TableLayoutPanel
            {
                Dock = DockStyle.Fill,
                ColumnCount = 2,
                RowCount = 3,
                AutoSize = true
            };
            lastTable.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
            lastTable.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
            _lastKeypad = AddStatusRow(lastTable, 0, "keyPad");
            _lastButton = AddStatusRow(lastTable, 1, "button");
            _lastTime = AddStatusRow(lastTable, 2, "время");
            lastGroup.Controls.Add(lastTable);
            layout.Controls.Add(lastGroup);

            var logGroup = new GroupBox
            {
                Text = "Лог",
                Dock = DockStyle.Fill
            };
            _logBox = new TextBox
            {
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical,
                Dock = DockStyle.Fill
            };
            logGroup.Controls.Add(_logBox);
            layout.Controls.Add(logGroup);

            Controls.Add(layout);
        }

        public void UpdateStatus()
        {
            if (InvokeRequired)
            {
                BeginInvoke(new Action(UpdateStatus));
                return;
            }

            _helperStatus.Text = "running";
            _sdkStatus.Text = _health.SdkInitialized ? "yes" : "no";
            var active = SelectedService();
            _receiverStatus.Text = active?.DeviceInfo?.Status ?? "unknown";
            _receivingStatus.Text = active?.IsReceiving == true ? "yes" : "no";
        }

        public void SetLastEvent(VendorButtonEvent evt)
        {
            if (InvokeRequired)
            {
                BeginInvoke(new Action<VendorButtonEvent>(SetLastEvent), evt);
                return;
            }

            _lastKeypad.Text = evt.KeyPad.ToString();
            _lastButton.Text = evt.ButtonId;
            _lastTime.Text = evt.PressedAt.ToLocalTime().ToString("HH:mm:ss");
        }

        public void AppendLog(string message)
        {
            if (InvokeRequired)
            {
                BeginInvoke(new Action<string>(AppendLog), message);
                return;
            }

            _logBox.AppendText(message + Environment.NewLine);
        }

        private Label AddStatusRow(TableLayoutPanel table, int rowIndex, string label)
        {
            table.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            var labelControl = new Label
            {
                Text = label,
                AutoSize = true,
                ForeColor = Color.DimGray,
                Margin = new Padding(4)
            };
            var valueControl = new Label
            {
                Text = "-",
                AutoSize = true,
                Margin = new Padding(4)
            };
            table.Controls.Add(labelControl, 0, rowIndex);
            table.Controls.Add(valueControl, 1, rowIndex);
            return valueControl;
        }

        private Button CreateButton(string text, Action onClick)
        {
            var button = new Button
            {
                Text = text,
                AutoSize = true,
                Margin = new Padding(6)
            };
            button.Click += (sender, args) => onClick?.Invoke();
            return button;
        }

        private IReceiverService SelectedService()
        {
            if (_receiverSelector.SelectedItem == null)
            {
                return _services.FirstOrDefault();
            }

            var selectedId = _receiverSelector.SelectedItem.ToString();
            foreach (var service in _services)
            {
                if (service.DeviceInfo.ReceiverId == selectedId)
                {
                    return service;
                }
            }
            return _services.FirstOrDefault();
        }
    }
}