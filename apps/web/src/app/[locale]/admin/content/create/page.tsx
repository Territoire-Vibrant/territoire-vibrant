import { ArticleForm } from '../components/ArticleForm'

export default function PublicationCreatePage() {
  return (
    <div className='mx-auto w-full max-w-6xl px-6 py-10'>
      <ArticleForm mode='create' />
    </div>
  )
}
