import React, { useState } from "react";

const ProfilePage = () => {
  const [profile, setProfile] = useState({
    name: "sita katwal",
    email: "sita@example.com",
    phone: "9800000000",
    address: "Kathmandu, Nepal",
  });

  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    setAvatar(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    console.log("Saving profile...", profile, avatar);
    // API call here
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Profile</h2>

      {/* CARD */}
      <div className="bg-white rounded-xl shadow p-6">
        {/* Avatar */}
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24">
            <img
              src={
                preview || "https://via.placeholder.com/150?text=Avatar"
              }
              alt="avatar"
              className="w-full h-full rounded-full object-cover border"
            />
          </div>

          <div>
            <label className="cursor-pointer bg-gray-100 px-4 py-2 rounded-lg border text-sm hover:bg-gray-200">
              Upload New Photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </label>
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG — max 5MB
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div>
            <label className="text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              name="name"
              value={profile.name}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              value={profile.email}
              disabled
              className="mt-1 w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Phone</label>
            <input
              type="text"
              name="phone"
              value={profile.phone}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Address</label>
            <input
              type="text"
              name="address"
              value={profile.address}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSubmit}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Save Changes
        </button>
      </div>

      {/* Password Section */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-medium text-gray-800">Change Password</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Current Password</label>
            <input
              type="password"
              className="mt-1 w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">New Password</label>
            <input
              type="password"
              className="mt-1 w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <button className="mt-6 px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">
          Update Password
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
