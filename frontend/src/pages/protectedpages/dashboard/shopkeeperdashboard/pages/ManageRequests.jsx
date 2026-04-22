import React from 'react'
import { fetchRequests, postRequestAction } from '../../../../../api/Requests'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

const ManageRequests = () => {

  const queryClient = useQueryClient()
  const [status, setStatus] = useState('all')
  const [processingId, setProcessingId] = useState(null)
  const mutation = useMutation({
    mutationFn: postRequestAction,
    onSuccess: (res) => {
      setProcessingId(null)
      queryClient.invalidateQueries(['manage-requests', status])
    },
    onError: (err) => {
      setProcessingId(null)
      console.error('Request action failed', err)
      alert('Action failed: ' + (err?.response?.data?.detail || err?.message || 'Unknown error'))
    }
  })

  const mutateAction = (payload) => {
    mutation.mutate(payload)
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['manage-requests', status],
    queryFn: () => fetchRequests(status),
  })
  const requests = data?.results || []
  const total = data?.count || 0

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Manage Requests</h1>

      {isLoading && <p>Loading requests...</p>}

      {/* Status filter */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm text-gray-600">Filter by status:</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-md bg-white text-sm"
        >
          <option value="all">All</option>
          <option value="accepted">Accepted</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
        <div className="text-sm text-gray-500">Showing <span className="font-semibold text-gray-900">{requests.length}</span> of <span className="font-semibold text-gray-900">{total}</span></div>
      </div>

      {isError && (
        <p className="text-red-500">Error loading requests: {error?.message || 'Unknown error'}</p>
      )}

      {!isLoading && !isError && requests.length === 0 && (
        <div className="text-gray-600">No requests found.</div>
      )}

      {!isLoading && !isError && requests.length > 0 && (
        <div className="space-y-4">
          {requests.map((request) => {
            const created = request.created_at ? new Date(request.created_at) : null
            const initials = request.customer_name ? request.customer_name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase() : 'U'

            const handleAccept = () => {
                        setProcessingId(request.id)
                        mutateAction({ request_id: request.id, action: 'accept' })
            }

            const handleDecline = () => {
              if (!window.confirm('Decline this request?')) return
              setProcessingId(request.id)
              mutateAction({ request_id: request.id, action: 'reject' })
            }

            const handleUnfriend = () => {
              if (!window.confirm('Unfriend this user? This will set the request to rejected.')) return
              setProcessingId(request.id)
              // Use same endpoint to mark as rejected
              mutateAction({ request_id: request.id, action: 'reject' })
            }

            const handleBlock = () => {
              if (!window.confirm('Block this user?')) return
              // backend endpoint for unfriend/block not provided; stubbed for now
              console.log('Block (not implemented on backend):', request.id)
            }

            return (
              <div key={request.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-semibold text-lg">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">{request.customer_name}</h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{request.status}</span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{request.customer_email}</p>
                    <p className="text-xs text-gray-400">{created ? created.toLocaleString() : '-'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {request.status === 'pending' && (
                    <>
                      <button disabled={processingId === request.id || mutation.isLoading} onClick={handleAccept} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">{processingId === request.id && mutation.isLoading ? 'Processing...' : 'Accept'}</button>
                      <button disabled={processingId === request.id || mutation.isLoading} onClick={handleDecline} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">Decline</button>
                    </>
                  )}

                  {request.status === 'accepted' && (
                    <>
                      <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">View</button>
                      <div className="flex gap-2">
                          <button onClick={handleUnfriend} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100">Unfriend</button>
                          <button onClick={handleBlock} className="px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm hover:bg-gray-100">Block</button>
                      </div>
                    </>
                  )}

                  {request.status === 'rejected' && (
                    <div className="text-sm text-gray-500">Request rejected</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ManageRequests