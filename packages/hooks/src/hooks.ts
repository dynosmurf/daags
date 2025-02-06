import { useState, useEffect } from 'react'
import { Entity, Mutation } from '@daags/core'

export function useEntity<T>(entity: Entity<T, any>) {
  let [value, setValue] = useState(entity.getState())

  useEffect(() => {
    entity.mount()
    setValue(entity.getState())

    let changeHandler = () => {
      setValue(entity.getState())
    }
    entity.onChange(changeHandler)

    return () => {
      entity.unmount()
      entity.cancelOnChange(changeHandler)
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
