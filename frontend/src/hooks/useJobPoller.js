import { useState, useEffect, useRef } from 'react'
import { getJob } from '../api/axios'

const TERMINAL = ['SUCCESS', 'FAILED', 'CANCELLED']

export default function useJobPoller(initialJob, intervalMs = 2000) {
  const [job, setJob] = useState(initialJob)
  const pollRef = useRef(null)

  const isTerminal = TERMINAL.includes(job.status)

  useEffect(() => {
    if (isTerminal) return

    pollRef.current = setInterval(async () => {
      try {
        const res = await getJob(job.id)
        setJob(res.data)
      } catch (_) {

      }
    }, intervalMs)

    return () => clearInterval(pollRef.current)
  }, [job.id, isTerminal, intervalMs])

  return { job, isTerminal }
}