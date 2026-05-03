export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white py-8">
      <div className="container-app flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-gray-400">
          © {new Date().getFullYear()} Worklyn. All rights reserved.
        </p>
        <div className="flex gap-6">
          <a href="#" className="text-sm text-gray-400 hover:text-gray-600">
            Privacy
          </a>
          <a href="#" className="text-sm text-gray-400 hover:text-gray-600">
            Terms
          </a>
        </div>
      </div>
    </footer>
  )
}
