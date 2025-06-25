function Footer() {
  return (
    <footer className="footer glass-footer" style={{ 
      background: 'rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 4px 30px rgba(255, 255, 255, 0.1)',
      width: '100%',
      marginTop: '3rem',
      padding: '20px 4rem',
      borderTop: '1px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '0',
      position: 'relative',
      zIndex: 10
    }}>
      <div className="footer-container" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <div className="footer-bottom" style={{
          fontSize: '14px',
          opacity: 0.8,
          color: '#374151'
        }}>
          <p className="text-sm">© 2025 StrideShift Global. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer 