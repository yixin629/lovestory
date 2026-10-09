export interface Photo {
  id: string
  title: string
  description: string
  url: string
  uploadedBy: string
  createdAt: string
  likes: number
  tag?: string
}

export interface PhotoRecord {
  id: string
  title: string | null
  description: string | null
  image_url: string
  uploaded_by: string | null
  created_at: string
  likes: number | null
  tag: string | null
}
