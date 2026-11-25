import * as stylex from '@stylexjs/stylex'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { type ItemDetail, itemQueryOptions, saveItem } from '../api'

export default function ItemEditor({ item, onClose }: { item: ItemDetail; onClose: () => void }) {
  const queryClient = useQueryClient()
  const nameRef = useRef<HTMLInputElement>(null)
  const save = useMutation({
    mutationFn: (patch: Partial<ItemDetail>) => saveItem(item.id, patch),
    onSuccess: (saved) => {
      queryClient.setQueryData(itemQueryOptions(item.id).queryKey, saved)
      onClose()
    },
  })

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    save.mutate({
      name: String(form.get('name')),
      status: form.get('status') as ItemDetail['status'],
      notes: String(form.get('notes')),
    })
  }

  return createPortal(
    <div {...stylex.props(styles.backdrop)} data-testid="editor-backdrop">
      <div role="dialog" aria-modal="true" aria-label={`Edit ${item.name}`} {...stylex.props(styles.dialog)}>
        <h2 {...stylex.props(styles.heading)}>Edit {item.name}</h2>
        <form onSubmit={submit} {...stylex.props(styles.form)}>
          <label {...stylex.props(styles.field)}>
            Name
            <input ref={nameRef} name="name" defaultValue={item.name} required {...stylex.props(styles.control)} />
          </label>
          <label {...stylex.props(styles.field)}>
            Status
            <select name="status" defaultValue={item.status} {...stylex.props(styles.control)}>
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="invited">invited</option>
              <option value="archived">archived</option>
            </select>
          </label>
          <label {...stylex.props(styles.field)}>
            Notes
            <textarea name="notes" rows={4} defaultValue={item.notes} {...stylex.props(styles.control)} />
          </label>
          {save.isError ? <p role="alert">Save failed: {save.error.message}</p> : null}
          <div {...stylex.props(styles.actions)}>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

const styles = stylex.create({
  backdrop: {
    position: 'fixed',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  dialog: {
    width: 'min(480px, calc(100vw - 32px))',
    padding: 20,
    borderRadius: 10,
    backgroundColor: 'Canvas',
    color: 'CanvasText',
  },
  heading: { marginTop: 0, fontSize: 18 },
  form: { display: 'grid', gap: 12 },
  field: { display: 'grid', gap: 4, fontSize: 13 },
  control: { font: 'inherit', paddingBlock: 6, paddingInline: 8 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 8 },
})
