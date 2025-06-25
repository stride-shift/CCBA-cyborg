import { useState } from 'react'
import Layout from '../components/Layout'

function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Handle form submission here
    console.log('Form submitted:', formData)
    // You can add form submission logic here (e.g., send to API)
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-16 relative">
        {/* Background circles */}
        <div className="absolute top-0 right-10 w-80 h-80 rounded-full glassmorphism opacity-40"></div>
        <div className="absolute bottom-40 left-0 w-64 h-64 rounded-full glassmorphism opacity-30"></div>
        <div className="absolute bottom-20 right-1/3 w-96 h-96 rounded-full glassmorphism opacity-30"></div>

        {/* Header Section */}
        <div className="relative z-10 mb-12">
          {/* Get In Touch Badge */}
          <div className="mb-6">
            <div className="inline-block glassmorphism px-5 py-2 rounded-full">
              <span className="text-white text-sm font-medium">Get In Touch</span>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl font-bold mb-6" style={{ color: '#0a1628' }}>
            Contact Us
          </h1>

          {/* Description */}
          <p className="text-lg leading-relaxed max-w-3xl" style={{ color: '#0a1628' }}>
            Have questions about Cyborg Habits? We're here to help you develop the habits, skills, and mindsets needed to thrive in an AI-enhanced world.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16 relative z-10">
          {/* Send Us a Message Form */}
          <div className="glassmorphism rounded-2xl p-8" style={{
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#0a1628' }}>
              Send Us a Message
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name and Email Row */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2" style={{ color: '#0a1628' }}>
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: '#0a1628' }}>
                    Your Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium mb-2" style={{ color: '#0a1628' }}>
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="How can we help you?"
                  className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2" style={{ color: '#0a1628' }}>
                  Your Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Tell us about your inquiry..."
                  rows="6"
                  className="w-full px-4 py-3 rounded-xl bg-white/70 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent resize-none transition-all"
                  required
                ></textarea>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all hover:transform hover:scale-105"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  boxShadow: 'rgba(255, 255, 255, 0.1) 0px 2.00778px 15.0195px 0px',
                  transform: 'translateY(-0.00389044px)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#0f4f66',
                  fontWeight: '600'
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send Message
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <div className="glassmorphism rounded-2xl p-8" style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}>
              <h2 className="text-2xl font-bold mb-8" style={{ color: '#0a1628' }}>
                Contact Information
              </h2>

              <div className="space-y-8">
                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1" style={{ color: '#0a1628' }}>Email Us</h3>
                    <a href="mailto:contact@cyborghabits.com" style={{ color: '#0a1628' }} className="hover:text-gray-800">
                      contact@cyborghabits.com
                    </a>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1" style={{ color: '#0a1628' }}>Visit Us</h3>
                    <p style={{ color: '#0a1628' }}>
                      7 Escombe Avenue, Parktown<br />
                      West<br />
                      Johannesburg, 2193<br />
                      South Africa
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Office Hours */}
            <div className="glassmorphism rounded-2xl p-8" style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}>
              <h2 className="text-2xl font-bold mb-6" style={{ color: '#0a1628' }}>
                Office Hours
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span style={{ color: '#0a1628' }}>Monday - Friday:</span>
                  <span className="font-semibold" style={{ color: '#0a1628' }}>9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: '#0a1628' }}>Saturday:</span>
                  <span className="font-semibold" style={{ color: '#0a1628' }}>Closed</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: '#0a1628' }}>Sunday:</span>
                  <span className="font-semibold" style={{ color: '#0a1628' }}>Closed</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="rounded-2xl overflow-hidden shadow-xl mb-16">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3580.5247!2d28.020737!3d-26.179577!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1e950c1a487e9625%3A0x8cdb991e2f1f492d!2s7%20Escombe%20Ave%2C%20Parktown%2C%20Johannesburg%2C%202193%2C%20South%20Africa!5e0!3m2!1sen!2sus!4v1620000000000!5m2!1sen!2sus"
            width="100%"
            height="400"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full"
          ></iframe>
        </div>
      </div>
    </Layout>
  )
}

export default ContactPage 