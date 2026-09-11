'use client'
import React, { useEffect } from 'react'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from "@/components/ui/navigation-menu"
import { auth, signOut } from '@/app/auth'
import { Button } from './ui/button'
import { handleLogout } from '@/app/(auth)/login/actions'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Tooltip, TooltipContent } from './ui/tooltip'
import { TooltipTrigger } from '@radix-ui/react-tooltip'
import { usePathname } from "next/navigation";

const navItems = [
  {
    'name': 'About Us',
    'link':''
  },
  {
    'name': 'Contact Us',
    'link':'https://www.linkedin.com/in/chirag-gupta-528294217/'
  }
]

const Navbar =  () => {
  const {data:session,update,status} = useSession();
  // const session = await auth()
  // console.log(session)
  const pathname = usePathname();

  useEffect(() => {
    // Run your refresh logic here
    update()
    console.log("Path changed → refresh logic runs");
  }, [pathname]);


  return (
    <nav className='w-full border-b-1 border-black px-1 py-1'>
      <div className='flex justify-between items-center'>
        <NavigationMenu className='p-2 ml-6 mt-2 flex justify-between w-full'>

          <NavigationMenuList className='flex-row space-x-7 '>

            <NavigationMenuItem>
              <Link className='font-bold text-xl' href='/'>AI Interview App</Link>
            </NavigationMenuItem>

          </NavigationMenuList>
        </NavigationMenu>

        <NavigationMenu>

          <NavigationMenuList className='flex flex-row space-x-4 mt-1 '>
            {navItems.map((item, index) => <NavigationMenuItem key={index}><Link href={item.link} className='hover:underline hover:text-blue-500' target='_blank'>{item.name}</Link></NavigationMenuItem>)}
          </NavigationMenuList>

        </NavigationMenu>

{status!='unauthenticated' && <>
        <NavigationMenu>
          <NavigationMenuList className='flex flex-row space-x-6 pr-2'>
            <NavigationMenuItem className='font-semibold'>
              <Tooltip>
                <TooltipTrigger>
                  Hi {session?.user?.name}
                </TooltipTrigger>
                <TooltipContent>
                  <span className='font-sm italic '> Email : {session?.user.email}</span>
                </TooltipContent>
              </Tooltip>
              </NavigationMenuItem>
            <NavigationMenuItem>
              <Button variant="default" onClick={handleLogout}>Sign Out</Button>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
</>}

{status=='unauthenticated' && (
        <NavigationMenu>
          <NavigationMenuList className='flex flex-row space-x-3 pr-2'>
            <NavigationMenuItem>
              <Link href='/login' className='text-sm font-medium text-neutral-700 hover:text-blue-500'>Log in</Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Button asChild variant='default' className='rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-600 hover:to-purple-600'>
                <Link href='/signup'>Get Started</Link>
              </Button>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
)}

      </div>

    </nav>

  )
}

export default Navbar

