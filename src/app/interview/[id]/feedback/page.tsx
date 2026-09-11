import React from 'react'
import { getInterviewDetails, getQuestions } from '../perform/actions'
import FeedbackAccordion from '@/components/FeedbackAccordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Chart from '@/components/Chart'
import { auth } from '@/app/auth'
import { redirect } from 'next/navigation'
import FeedbackPending from '@/components/interview/FeedbackPending'

interface PageProps {
  params: Promise<{ id: string }>
}


const page = async ({ params }: PageProps) => {

  
    const session = await auth()
    if(!session?.user){
      redirect('/login')
    }
  

  const id = (await params).id as string
  console.log("feedback", id)

  const interview = await getInterviewDetails(id)
  const det = await getQuestions(id)



  const arr = det?.extracted?.parameterScores

  // `status` flips to 'completed' the moment answers are saved, but the scores
  // only exist once the inngest `generateInsights` run finishes. Anything that
  // reads `extracted` must come AFTER this guard — reading it above was what
  // crashed the page with "Cannot convert undefined or null to object".
  if (!det || !arr) {
    return <FeedbackPending interviewId={id} hasAnswers={!!det} />
  }

  const labels = Object.keys(arr) as string[]
  const data = Object.values(arr) as number[]

  return (
    <div className='flex flex-col'>
      <div className='flex flex-col mx-18 p-2 mt-3 gap-6'>
        <div className='flex flex-col'>
          <span className='bg-gradient-to-r from-orange-500 to-blue-500 text-transparent bg-clip-text font-extrabold text-4xl'>Your Feedback for </span>
          <span className='text-xl text-gray-500'>{interview?.jobTitle} Role at {interview?.companyName}</span>
        </div>
        <div className={`${det?.extracted?.overallScore < 3 ? 'bg-red-400' : det?.extracted?.overallScore < 7 ? 'bg-yellow-200' : 'bg-green-300'} w-[18vw] p-1 rounded-md`}>
          <span className='text-2xl font-semibold'>Overall Score: {det?.extracted?.overallScore} / 10</span>
        </div>

        <div className='flex flex-row w-full'>
          {/* <div className='w-[50%]'>
            <FeedbackAccordion advice={det?.extracted?.adviceForImprovement}/>
          </div>

           <div className='w-[50%]'>
second
          </div> */}
          <Tabs defaultValue='visual' className='w-full ' color='black' >
            <TabsList className='w-full flex flex-row gap-2'>
              <TabsTrigger value="visual">Visual Feedback</TabsTrigger>
              <TabsTrigger value="question">Question Wise Feedback</TabsTrigger>
            </TabsList>
            <TabsContent value="visual" className='flex flex-col gap-5'>
              <div>
                <span>
                  <span className='font-semibold'>Overall Verdict :</span> {det?.extracted?.overallVerdict}</span>
              </div>
              <div style={{ width: '35vw', margin: '0 auto' }} className='flex flex-col'>
                <span className='font-bold text-2xl'>Various Areas you have been Scored Upon</span>
                <Chart data={data} labels={labels}/>
              </div>
            </TabsContent>
            <TabsContent value="question"><FeedbackAccordion advice={det?.extracted?.adviceForImprovement}/></TabsContent>
          </Tabs>

        </div>
      </div>
    </div>
  )
}

export default page
