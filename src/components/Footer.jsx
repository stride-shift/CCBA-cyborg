function Footer() {
  return (
    <footer className="footer" style={{ 
      background: '#000000',
      width: '100%',
      marginTop: 'auto',
      padding: '20px 2rem',
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
          color: 'rgba(255, 255, 255, 0.7)'
        }}>
          <p className="text-sm">© 2025 StrideShift Global. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer 