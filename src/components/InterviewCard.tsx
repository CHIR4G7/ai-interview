import React from 'react'
import { InterviewCardProps } from '@/types/interview'
import { getLogo } from '@/lib/utils'
import Image from 'next/image'
import { Badge } from "@/components/ui/badge"
import { Button } from './ui/button'
import { FileText } from 'lucide-react';
import { MessageCircleCode } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from 'next/link'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'

function capitalizeFirstWord(str: string) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const InterviewCard = async ({ interview }: InterviewCardProps) => {
  const res = await getLogo(interview.companyName)
  const image = res?.image || 'https://picsum.photos/200/300'

  const createdAt = new Date(interview.createdAt);
  const formatted = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(createdAt.getDate()).padStart(2, '0')} ${String(createdAt.getHours()).padStart(2, '0')}:${String(createdAt.getMinutes()).padStart(2, '0')}`;

  const skills = interview.skills
  let renderSkills;
  if(skills.length>6){
    renderSkills = skills.slice(0,8)
  }else{
    renderSkills = skills
  }

  return (
    <div className='border-2 border-black rounded-sm bg-gray-50 m-4 p-2 flex flex-row gap-4 w-[25vw] '>


      <div className='flex flex-col mt-2 ml-3 gap-3'>
        <div className='flex flex-col'>
          <span className='text-xl font-bold'> {capitalizeFirstWord(interview.companyName)}</span>
          <span className='text-md'>{interview.jobTitle}</span>
        </div>
        <div className='flex flex-wrap gap-2'>
          <span className='text-md font-semibold'>Skills :</span>
          <div className='flex flex-wrap gap-2'>{renderSkills.map((skill)=><Badge variant='outline' key={skill}>{skill}</Badge>)} <span className='text-sm mt-1 italic hover:underline hover:text-blue-700' >
            <Dialog>
  <DialogTrigger>...more</DialogTrigger>
  <DialogContent >
    <DialogHeader className='flex flex-col gap-2'>
      <DialogTitle>All Skills for this Interview.</DialogTitle>
      <DialogDescription className='flex flex-wrap gap-1'>
       {skills.map((skill)=><Badge variant='outline' key={skill}>{skill}</Badge>)}
      </DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>
            </span></div>
        </div>
        <div className='flex flex-col'>
           <span className='text-xs italic'>
            Created At {formatted}
          </span>
          
        </div>

        <div className='flex flex-row justify-between' >
          <div>
            <span>
            <Badge variant='outline' className={`${interview?.status==='completed' ? 'bg-green-400' : 'bg-yellow-400'}`}>{interview?.status}</Badge>
          </span>
          </div>
           <div className='flex flex-row-reverse gap-3 mr-2'>
         
          {/* The feedback link only opens once the graded report actually exists.
              `status === 'completed'` is set the instant answers are saved, so
              gating on it alone sent users to a page with no scores yet. */}
          {interview?.status !== 'ready' && (
            interview?.insightsReady ? (
              <Link href={`/interview/${interview._id}/feedback`}>
                <Tooltip>
                  <TooltipTrigger><FileText className='cursor-pointer'/></TooltipTrigger>
                  <TooltipContent>View Feedback</TooltipContent>
                </Tooltip>
              </Link>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    aria-disabled
                    className='cursor-not-allowed opacity-40'
                  >
                    <Loader2 className='animate-spin' />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Scoring your answers — feedback available shortly</TooltipContent>
              </Tooltip>
            )
          )}
         
         <Link href={`/interview/${interview._id}/perform`} className={`${interview?.status==='completed' ? 'hidden' : ''}`}>
         <Tooltip>
            <TooltipTrigger><MessageCircleCode className='cursor-pointer'/></TooltipTrigger>
            <TooltipContent>Give Interview</TooltipContent>
          </Tooltip>
            
         </Link>
        
        </div>

        </div>
       

      </div>

    </div>
  )
}

export default InterviewCard
