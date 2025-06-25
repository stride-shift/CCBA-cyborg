import Layout from '../components/Layout'

function SimpleAdminPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="glassmorphism rounded-2xl p-8">
          <h1 className="text-4xl font-bold text-white mb-4">Simple Admin Page</h1>
          <p className="text-white/80 mb-6">
            This page has no authentication checks - if you can see this, the routing works.
          </p>
          
          <div className="bg-white/10 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Page Loaded Successfully!</h2>
            <p className="text-white/70">
              If you can see this content, then the issue was with the authentication logic 
              in the other admin pages, not with the routing itself.
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <a href="/admin-debug" className="inline-block px-4 py-2 bg-blue-500/20 rounded-lg text-white hover:bg-blue-500/30">
              Go to Debug Page
            </a>
            <br />
            <a href="/admin-new" className="inline-block px-4 py-2 bg-green-500/20 rounded-lg text-white hover:bg-green-500/30">
              Try New Admin Page
            </a>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default SimpleAdminPage 