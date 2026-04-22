import React, { useState } from "react";
import Header from "../../../components/Header";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { ease: "easeOut" } },
};

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null); // null | 'sending' | 'success'

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = "Invalid email";
    if (!form.message.trim()) e.message = "Message is required";
    return e;
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setStatus("sending");

    // Simulate a submit (no network call here). Replace with actual API call as needed.
    setTimeout(() => {
      setStatus("success");
      setForm({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setStatus(null), 3500);
    }, 900);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <motion.section className="max-w-4xl mx-auto px-6 py-16" initial="hidden" animate="visible" variants={container}>
        <motion.div variants={item} className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Get in touch</h1>
          <p className="text-gray-600 mt-3">Questions, feedback, or need help? Drop us a message and we'll get back within 24 hours.</p>
        </motion.div>

        <motion.div variants={item} className="bg-white shadow rounded-xl p-6 md:p-8">
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.label variants={item} className="flex flex-col">
                <span className="text-sm text-gray-700 mb-1">Name</span>
                <input
                  className={`border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 ${errors.name ? "border-red-300" : "border-gray-200"}`}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                />
                {errors.name && <span className="text-red-500 text-sm mt-1">{errors.name}</span>}
              </motion.label>

              <motion.label variants={item} className="flex flex-col">
                <span className="text-sm text-gray-700 mb-1">Email</span>
                <input
                  className={`border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 ${errors.email ? "border-red-300" : "border-gray-200"}`}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@domain.com"
                />
                {errors.email && <span className="text-red-500 text-sm mt-1">{errors.email}</span>}
              </motion.label>
            </div>

            <motion.label variants={item} className="flex flex-col mt-4">
              <span className="text-sm text-gray-700 mb-1">Subject (optional)</span>
              <input
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 border-gray-200"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="How can we help?"
              />
            </motion.label>

            <motion.label variants={item} className="flex flex-col mt-4">
              <span className="text-sm text-gray-700 mb-1">Message</span>
              <textarea
                rows={6}
                className={`border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 ${errors.message ? "border-red-300" : "border-gray-200"}`}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Tell us what's on your mind"
              />
              {errors.message && <span className="text-red-500 text-sm mt-1">{errors.message}</span>}
            </motion.label>

            <div className="mt-6 flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="bg-blue-600 text-white px-5 py-2 rounded-xl shadow font-medium"
                disabled={status === "sending"}
              >
                {status === "sending" ? "Sending..." : "Send message"}
              </motion.button>

              <div className="text-sm text-gray-500">Or email us at <a className="text-blue-600" href="mailto:help@digitalkhata.example">help@digitalkhata.example</a></div>
            </div>
          </form>

          {status === "success" && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 bg-green-50 border border-green-100 text-green-700 p-3 rounded">
              Thanks — your message was sent. We'll reply soon.
            </motion.div>
          )}
        </motion.div>
      </motion.section>
    </div>
  );
};

export default Contact;