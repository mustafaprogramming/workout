export default function PageFallback() {
  return (
    <div className='min-h-[50vh] flex items-center justify-center bg-gray-900 text-gray-100 p-4'>
      <div
        className='bg-gray-800 p-8 rounded-lg shadow-[5px_5px_0px_0px_#030712] border border-gray-950 text-center'
        role='status'
        aria-live='polite'
      >
        <p className='text-lg font-semibold text-gray-200'>Loading page...</p>
      </div>
    </div>
  )
}
