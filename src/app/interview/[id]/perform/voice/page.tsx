import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * The voice interview is now the default at /interview/[id]/perform.
 * This path is kept so links and bookmarks from before the swap still work.
 */
const VoiceRedirect = async ({ params }: PageProps) => {
  const id = (await params).id as string
  redirect(`/interview/${id}/perform`)
}

export default VoiceRedirect
