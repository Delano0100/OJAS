import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useDevices } from '../hooks/useDevices'
import AddDeviceForm from '../components/devices/AddDeviceForm'
import DeviceList from '../components/devices/DeviceList'
import Loader from '../components/common/Loader'

export default function Devices() {
  const { devices, loading } = useDevices()
  const [showAddForm, setShowAddForm] = useState(false)

  if (loading) return <Loader />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-textPrimary mb-1">Devices</h1>
          <p className="text-textSecondary">Manage connected devices and equipment</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-5 w-5" />
          Add Device
        </button>
      </div>

      {/* Device List */}
      <DeviceList devices={devices} />

      {/* Add Device Modal */}
      {showAddForm && <AddDeviceForm onClose={() => setShowAddForm(false)} />}
    </div>
  )
}
