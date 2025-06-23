import { useState, useEffect } from 'react'
import { Entity, Mutation } from '@daags/core'

export function useEntity<T>(entity: Entity<T, any>) {
  const [value, setValue] = useState(entity.getState())
  const caller =
    new Error().stack?.split('\n')[2].trim().split(' ')[1] || 'Unknown'

  useEffect(() => {
    setValue(entity.getState())

    const changeHandler = () => {
      setValue(entity.getState())
    }
    entity.onChange(changeHandler, caller)

    entity.mount()

    return () => {
      entity.cancelOnChange(changeHandler)
      entity.unmount()
    }
  }, [])

  return value
}

export function useMutation<
  T extends readonly [...Entity<any, any>[]],
  P extends any[],
  M
>(mutation: Mutation<T, P, M, string>) {
  return mutation.getFn()
}
