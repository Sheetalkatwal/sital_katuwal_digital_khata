import React, { useState } from "react";
import { Switch } from "@headlessui/react";

const SettingPage = () => {
  // toggles
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [loanReminder, setLoanReminder] = useState(true);
  const [theme, setTheme] = useState("light");

  const handleSave = () => {
    // Persist settings (hook up to API later)
    const payload = { emailNotif, smsNotif, loanReminder, theme };
    console.log("Saving settings", payload);
    // show a user-friendly toast/modal in real app
    alert("Settings saved (demo)");
  };

  const handleReset = () => {
    setEmailNotif(true);
    setSmsNotif(false);
    setLoanReminder(true);
    setTheme("light");
  };

  return (
    <div className="mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your notifications, preferences and connected shops.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            Save changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* NOTIFICATION SETTINGS */}
        <section className="bg-white shadow rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">Notifications</h2>

          <div className="divide-y">
            <div className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm font-medium text-gray-800">
                  Email Notifications
                </div>
                <div className="text-xs text-gray-500">
                  Receive updates and receipts via email.
                </div>
              </div>
              <Switch
                checked={emailNotif}
                onChange={setEmailNotif}
                className={`${
                  emailNotif ? "bg-blue-600" : "bg-gray-200"
                } relative inline-flex h-6 w-11 items-center rounded-full transition`}
              >
                <span
                  className={`${
                    emailNotif ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                />
              </Switch>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm font-medium text-gray-800">
                  SMS Notifications
                </div>
                <div className="text-xs text-gray-500">
                  Receive short updates via SMS.
                </div>
              </div>
              <Switch
                checked={smsNotif}
                onChange={setSmsNotif}
                className={`${
                  smsNotif ? "bg-blue-600" : "bg-gray-200"
                } relative inline-flex h-6 w-11 items-center rounded-full transition`}
              >
                <span
                  className={`${
                    smsNotif ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                />
              </Switch>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm font-medium text-gray-800">
                  Loan Reminders
                </div>
                <div className="text-xs text-gray-500">
                  Receive reminders for pending loan payments.
                </div>
              </div>
              <Switch
                checked={loanReminder}
                onChange={setLoanReminder}
                className={`${
                  loanReminder ? "bg-blue-600" : "bg-gray-200"
                } relative inline-flex h-6 w-11 items-center rounded-full transition`}
              >
                <span
                  className={`${
                    loanReminder ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                />
              </Switch>
            </div>
          </div>
        </section>

        {/* APP PREFERENCES & CONNECTED SHOPS */}
        <div className="space-y-6">
          <section className="bg-white shadow rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-700">Preferences</h2>

            <div className="space-y-2">
              <label className="text-sm text-gray-700">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
              >
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
                <option value="system">System Default</option>
              </select>
            </div>
          </section>

          <section className="bg-white shadow rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-700">Connected Shops</h2>

            <p className="text-sm text-gray-500">
              Manage shops you are connected with.
            </p>

            <div className="space-y-2 mt-2">
              {/* Example static items, replace with API later */}
              <div className="flex items-center justify-between border p-3 rounded-lg">
                <span className="text-sm">Fresh Mart</span>
                <button className="text-red-500 text-sm hover:underline">
                  Disconnect
                </button>
              </div>

              <div className="flex items-center justify-between border p-3 rounded-lg">
                <span className="text-sm">Coffee Corner</span>
                <button className="text-red-500 text-sm hover:underline">
                  Disconnect
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* SECURITY */}
      <section className="bg-white shadow rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-700">Security</h2>
            <p className="text-sm text-gray-500">
              Manage your account security settings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
              Change Password
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">
              Delete Account
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingPage;
