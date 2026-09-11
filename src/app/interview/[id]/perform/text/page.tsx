import React from 'react'
import { notFound } from 'next/navigation'
import { getInterviewDetails, getQuestions } from '../actions'
import InterviewWrapper from '@/components/InterviewWrapper';
import { auth } from '@/app/auth';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>
}

function capitalizeFirstWord(str: string) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const page = async ({ params }: PageProps) => {


  // The voice interview replaced this as the default flow. The page is kept in
  // the repo so the text flow can be brought back or compared against, but it is
  // not reachable by users unless explicitly re-enabled.
  if (process.env.ENABLE_TEXT_INTERVIEW !== 'true') {
    notFound()
  }

  const session = await auth()
  if(!session?.user){
    redirect('/login')
  }

  const id = (await params).id as string
  console.log(id)


  const interview = await getInterviewDetails(id)
  const det = await getQuestions(id)

  return (
    <div className='flex flex-col'>
      <div className=' mx-22 mt-3 p-1 flex flex-col '>
        <div className='flex flex-col gap-1'>
          <div className='flex flex-row justify-center gap-2'>
            <span className='bg-gradient-to-r from-purple-500 to-blue-500 text-transparent bg-clip-text font-extrabold text-4xl'>Mock Interview </span>
            <span className='mt-3 font-semibold'>(Position- {interview?.jobTitle}, Company- {capitalizeFirstWord(interview?.companyName)})</span>
          </div>

          <div className='flex flex-row justify-center'>
            <div className='border-2 bg-gray-50 rounded-lg w-[80%] flex flex-col items-center p-2' >

              {det!==null ? <InterviewWrapper questions={det?.questions} id={id}/> : <span className='text-2xl font-semibold'>Interview Not Ready Please Visit After Few Minutes</span>}
              
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default page
