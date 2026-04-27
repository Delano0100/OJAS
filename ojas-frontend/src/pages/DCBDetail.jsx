import { ArrowLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDevices } from '../hooks/useDevices'
import Loader from '../components/common/Loader'
import DCBDetailView from '../components/devices/DCBDetailView'

export default function DCBDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { devices, loading } = useDevices()

  if (loading) return <Loader />

  const device = devices.find((d) => d.deviceId === id)
  if (!device || device.deviceType !== 'DCB') {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/devices')} className="flex items-center gap-2 text-primary hover:text-primary/80">
          <ArrowLeft className="h-5 w-5" />
          Back to Devices
        </button>
        <div className="section-card text-center py-12">
          <p className="text-textSecondary">Device not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => navigate('/devices')} className="mb-4 flex items-center gap-2 text-primary hover:text-primary/80">
          <ArrowLeft className="h-5 w-5" />
          Back to Devices
        </button>

        <div className="section-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-textPrimary mb-1">{device.name}</h1>
              <div className="space-y-1">
                <p className="text-textSecondary">{device.location || 'Location not specified'}</p>
                <p className="text-xs text-textSecondary">Device ID: {device.deviceId}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-success/20 text-success">
                Configured
              </div>
              <p className="mt-2 text-sm text-textSecondary">
                {device.createdAt ? `Created: ${new Date(device.createdAt).toLocaleString()}` : 'No timestamp'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Devices */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-textPrimary">Connected Sensors & Meters ({device.subDevices?.length || 0})</h2>
        <DCBDetailView device={device} />
      </div>
    </div>
  )
}
