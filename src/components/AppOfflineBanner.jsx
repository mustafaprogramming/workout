import useOfflineStatus from '../util/useOfflineStatus'

export default function AppOfflineBanner() {
  const isOffline = useOfflineStatus()

  return isOffline ? (
    <div
      className='bg-red-500 sm:fixed sm:top-[14px] left-2/4 sm:-translate-x-2/4 mx-auto sm:max-w-[500px] w-full text-white p-2 text-center xs:text-sm text-xs shadow-[4px_4px_0px_0px_#030712] border border-gray-950 z-[100] '
      role='status'
      aria-live='polite'
      aria-label='You are offline. Changes will sync when connection is restored.'
    >
      🔌 You are offline. Changes will sync when connection is restored.
    </div>
  ) : null
}
