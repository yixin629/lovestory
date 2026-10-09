'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { compressImages, formatFileSize } from '../lib/image-utils'

interface UploadFile {
  file: File
  preview: string
  title: string
  description: string
  tag?: string
  compressed?: boolean
  originalSize?: number
  compressedSize?: number
}

interface BatchUploadDialogProps {
  onClose: () => void
  onUpload: (files: UploadFile[]) => Promise<void>
  uploading: boolean
}

export default function BatchUploadDialog({
  onClose,
  onUpload,
  uploading,
}: BatchUploadDialogProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const filesRef = useRef<UploadFile[]>([])
  const uploadingRef = useRef(uploading)
  const { info, warning } = useToast()

  useEffect(() => {
    filesRef.current = files
  }, [files])

  useEffect(() => {
    uploadingRef.current = uploading
  }, [uploading])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !uploadingRef.current) {
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )
      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      if (
        event.shiftKey &&
        (document.activeElement === firstElement ||
          !dialogRef.current.contains(document.activeElement))
      ) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [onClose])

  useEffect(
    () => () => {
      filesRef.current.forEach((file) => URL.revokeObjectURL(file.preview))
    },
    []
  )

  const addFiles = useCallback(
    async (newFiles: File[]) => {
      if (files.length + newFiles.length > 10) {
        warning('最多只能同时上传 10 张照片')
        newFiles = newFiles.slice(0, 10 - files.length)
      }

      setCompressing(true)
      info('正在压缩图片...')

      try {
        const compressedFiles = await compressImages(newFiles)

        const uploadFiles: UploadFile[] = compressedFiles.map((file, index) => ({
          file,
          preview: URL.createObjectURL(file),
          title: '',
          description: '',
          tag: '日常',
          compressed: true,
          originalSize: newFiles[index].size,
          compressedSize: file.size,
        }))

        setFiles((prev) => [...prev, ...uploadFiles])
        info(`已添加 ${uploadFiles.length} 张照片`)
      } catch {
        warning('部分图片压缩失败')
      } finally {
        setCompressing(false)
      }
    },
    [files.length, warning, info]
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('image/')
      )

      if (droppedFiles.length > 0) {
        addFiles(droppedFiles)
      } else {
        warning('请只拖入图片文件')
      }
    },
    [warning, addFiles]
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles) {
      addFiles(Array.from(selectedFiles))
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const updateFile = (index: number, field: 'title' | 'description' | 'tag', value: string) => {
    setFiles((prev) => {
      const newFiles = [...prev]
      newFiles[index][field] = value
      return newFiles
    })
  }

  const handleUpload = async () => {
    if (files.some((f) => !f.title.trim())) {
      warning('请为所有照片填写标题')
      return
    }

    await onUpload(files)

    // 清理预览 URL
    files.forEach((f) => URL.revokeObjectURL(f.preview))
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-2 backdrop-blur-sm sm:p-4"
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-upload-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4 sm:p-6">
          <div>
            <h2 id="batch-upload-title" className="text-xl font-bold text-primary sm:text-2xl">
              批量上传照片
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              已选择 {files.length} 张照片 {files.length > 0 && `(最多 10 张)`}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-2xl font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            disabled={uploading}
            aria-label="关闭批量上传窗口"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Drag & Drop Zone */}
          {files.length < 10 && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`mb-6 rounded-xl border-2 border-dashed p-6 text-center transition-all sm:p-8 ${
                dragActive
                  ? 'border-primary bg-primary/5 scale-105'
                  : 'border-gray-300 hover:border-primary'
              }`}
            >
              <div className="text-6xl mb-4">📸</div>
              <p className="text-lg font-semibold mb-2">拖拽照片到这里</p>
              <p className="text-sm text-gray-600 mb-4">或者</p>
              <label className="btn-primary cursor-pointer inline-block">
                选择照片
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={compressing || uploading}
                />
              </label>
              <p className="text-xs text-gray-500 mt-4">支持 JPG、PNG、GIF 等格式，自动压缩</p>
            </div>
          )}

          {/* File List */}
          {compressing && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-gray-600">正在压缩图片...</p>
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-4">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-all"
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {/* Preview */}
                    <div className="relative h-44 w-full flex-shrink-0 sm:h-32 sm:w-32">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={file.preview}
                        alt={`预览 ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute -right-2 -top-2 flex min-h-9 min-w-9 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                        disabled={uploading}
                        aria-label={`移除照片 ${index + 1}`}
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        placeholder={`照片标题 ${index + 1} *`}
                        value={file.title}
                        onChange={(e) => updateFile(index, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-primary focus:outline-none"
                        disabled={uploading}
                        aria-label={`照片 ${index + 1} 的标题`}
                      />
                      <select
                        value={file.tag || '日常'}
                        onChange={(e) => updateFile(index, 'tag', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-primary focus:outline-none bg-white"
                        disabled={uploading}
                        aria-label={`照片 ${index + 1} 的分类`}
                      >
                        <option value="约会">💕 约会</option>
                        <option value="美食">🍔 美食</option>
                        <option value="旅行">✈️ 旅行</option>
                        <option value="自拍">📷 自拍</option>
                        <option value="风景">🌄 风景</option>
                        <option value="日常">📅 日常</option>
                        <option value="节日">🎉 节日</option>
                      </select>
                      <textarea
                        placeholder="照片描述（可选）"
                        value={file.description}
                        onChange={(e) => updateFile(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-primary focus:outline-none resize-none"
                        rows={2}
                        disabled={uploading}
                        aria-label={`照片 ${index + 1} 的描述`}
                      />
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                        <span>原始: {formatFileSize(file.originalSize || 0)}</span>
                        <span>压缩后: {formatFileSize(file.compressedSize || 0)}</span>
                        {file.originalSize && file.compressedSize && (
                          <span className="text-green-600">
                            节省 {Math.round((1 - file.compressedSize / file.originalSize) * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {files.length > 0 && (
          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 p-4 sm:flex-row sm:gap-4 sm:p-6">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 flex-1 rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold transition-all hover:bg-gray-100"
              disabled={uploading}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || files.some((f) => !f.title.trim())}
              className="btn-primary min-h-11 flex-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? '上传中...' : `上传 ${files.length} 张照片`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
