import { Dashboard } from '@/components/pyros/dashboard'

export default function ComparePage() {
  return <Dashboard initialView="map" initialSplitScreen={true} initialMode="dbscan" />
}
