export default function PageFallback() {
  return (
    <div className='fixed inset-0 z-[60] flex items-center justify-center bg-gray-900 text-gray-100 p-4'>
      <div className=' p-8  text-center' role='status' aria-live='polite'>
        <p className="text-lg font-semibold text-gray-200  after:content-['.'] after:animate-dots ">
          Loading page
          <span className='sr-only'>loading</span>
        </p>
      </div>
    </div>
  )
}
