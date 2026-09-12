'use client'
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"
import {  useRouter } from "next/navigation"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { createInterview, parsingResume } from "./actions"
import { saveResume, getSavedResume } from "@/app/profile/actions"
import { LoaderOne } from "@/components/ui/loader";
import { Textarea } from "@/components/ui/textarea"
import { Upload, X, CheckCircle2 } from "lucide-react"

const schema = z.object({
    jobTitle:z.string().min(3,"Job Title Too Short"),
    jobDesc: z.string().min(30, "Job Description Too Short"),
    skills: z.array(z.string().min(1, "Enter Valid Skill")).min(5, "Enter at least 5 Skills"),
    companyName: z.string().min(1, "Enter Valid Company Name"),
    resume: z.any().optional()
})


const Createform = () => {

    // const session = await auth()
    // console.log(session?.user)

    const router = useRouter()
    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: {
            jobTitle:'',
            jobDesc: '',
            skills: [],
            companyName: ''
        }
    })

    const [projectContext,setProjectContext] = useState<string[]>([])
    const [resumePrefilled,setResumePrefilled] = useState<boolean>(false)
    const [workExDetails,setWorkExDetails] = useState<string[]>([])

    const [loading,setLoading] = useState<boolean>(false)

    // Pull the saved resume in so returning users skip the upload entirely.
    useEffect(() => {
        let cancelled = false
        getSavedResume()
            .then((resume) => {
                if (cancelled || !resume) return
                if (resume.projectContext?.length) setProjectContext(resume.projectContext)
                if (resume.workExDetails?.length) setWorkExDetails(resume.workExDetails)
                if (resume.skills?.length && form.getValues('skills').length === 0) {
                    form.setValue('skills', resume.skills)
                }
                setResumePrefilled(true)
            })
            .catch((err) => console.error('Could not load saved resume:', err))
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const onSubmit = async (data: z.infer<typeof schema>) => {

        try {
            const response = await createInterview(data,projectContext,workExDetails)
            if (!response?.ok) {
                toast.error(response?.error ?? 'Interview could not be created.')
                if (response?.code === 'no-credits') router.refresh()
                return
            }
            toast.success("Interview created! Questions are being generated.")
            router.push('/')
            router.refresh()
        } catch (error) {
            toast.error("Interview Not Created!")
        }
    }

    const [input, setInput] = useState('')

    
    const [uploading,setUploading] = useState<boolean>(false)
    const [fileName,setFileName] = useState<string>('')   

    const parseResume = async (file: File) => {
        toast("Parsing You Resume")
        setLoading(true)
        await new Promise((res) => setTimeout(res, 2500))
      

        const {data} = await parsingResume(file)
        const {skills,projects,workex} = data

        // Replace rather than append: re-uploading previously stacked the new
        // resume on top of the old one, so a second upload sent both.
        setProjectContext([projects])
        setWorkExDetails([workex])

        form.setValue("skills",skills)

        // Persist to the profile so the next interview does not need another
        // upload or another Gemini parse.
        try {
            await saveResume({ projectContext:[projects], workExDetails:[workex], skills })
        } catch (err) {
            console.error('Could not save resume to profile:', err)
        }

        setResumePrefilled(true)
        setLoading(false)
        toast.success("Resume parsed, saved to your profile and skills auto-filled!");
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">

                {/* ---- resume first: it fills most of the form ---- */}
                <div className="flex flex-col gap-2">
                    <div className="flex flex-row items-baseline justify-between">
                        <span className="text-sm font-bold text-neutral-900">Start with your resume</span>
                        <span className="text-xs text-neutral-400">Optional, but fills most fields</span>
                    </div>

                    <label
                        htmlFor="resume-upload"
                        className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-5 py-7 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/40"
                    >
                        {loading ? (
                            <>
                                <LoaderOne />
                                <span className="text-xs text-neutral-500">Reading your resume…</span>
                            </>
                        ) : (
                            <>
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-sm">
                                    <Upload size={17} />
                                </span>
                                <span className="text-sm font-semibold text-neutral-800">
                                    {fileName ? fileName : 'Upload your resume'}
                                </span>
                                <span className="text-xs text-neutral-500">PDF only</span>
                            </>
                        )}
                    </label>

                    <Input
                        id="resume-upload"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                                setFileName(file.name)
                                parseResume(file)
                            }
                        }}
                    />

                    {resumePrefilled && !loading && (
                        <div className="flex flex-row items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                            <CheckCircle2 size={14} className="shrink-0" />
                            Using the resume saved to your profile. Upload a new one to replace it.
                        </div>
                    )}
                </div>

                <div className="flex flex-row items-center gap-3">
                    <span className="h-px flex-1 bg-neutral-200" />
                    <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                        Role details
                    </span>
                    <span className="h-px flex-1 bg-neutral-200" />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="jobTitle"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-sm font-semibold">Job title<span className="text-red-500"> *</span></FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Backend Engineer" className="h-11 rounded-xl" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-sm font-semibold">Company<span className="text-red-500"> *</span></FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Stripe" className="h-11 rounded-xl" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="jobDesc"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-semibold">Job description<span className="text-red-500"> *</span></FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Paste the job description here. The more detail, the more specific your questions will be."
                                    className="min-h-[140px] rounded-xl"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="skills"
                    render={({ field }) => {
                        const addSkill = () => {
                            const trimmed = input.trim()
                            if (trimmed && !field.value.includes(trimmed) && field.value.length < 10) {
                                form.setValue("skills", [...field.value, trimmed], { shouldValidate: true });
                                setInput("");
                            }
                        }
                        const removeSkill = (skill: string) => {
                            form.setValue("skills", field.value.filter((s) => s != skill), { shouldValidate: true })
                        }
                        return (
                            <FormItem>
                                <div className="flex flex-row items-baseline justify-between">
                                    <FormLabel className="text-sm font-semibold">Skills<span className="text-red-500"> *</span></FormLabel>
                                    <span className={`text-xs ${field.value.length >= 5 ? 'text-green-600' : 'text-neutral-400'}`}>
                                        {field.value.length}/10 · need at least 5
                                    </span>
                                </div>
                                <div className="flex flex-row gap-2">
                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") { e.preventDefault(); addSkill() }
                                        }}
                                        placeholder="Add a skill and press Enter"
                                        className="h-11 rounded-xl"
                                    />
                                    <Button type="button" onClick={addSkill} variant="outline" className="h-11 rounded-xl px-4">
                                        Add
                                    </Button>
                                </div>
                                {field.value.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {field.value.map((skill, index) => (
                                            <span key={index} className="flex flex-row items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
                                                {skill}
                                                <button type="button" onClick={() => removeSkill(skill)} className="text-blue-500 hover:text-blue-900" aria-label={`Remove ${skill}`}>
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <FormMessage />
                            </FormItem>
                        )
                    }}
                />

                <div className="flex flex-col gap-2 border-t border-neutral-100 pt-5">
                    <Button
                        variant="default"
                        type="submit"
                        className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-base font-semibold shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:shadow-none"
                        disabled={!form.formState.isValid || loading || form.formState.isSubmitting}
                    >
                        {form.formState.isSubmitting ? 'Creating…' : 'Create interview'}
                    </Button>
                    <span className="text-center text-xs text-neutral-400">
                        Uses one credit. Questions take about a minute to generate.
                    </span>
                </div>
            </form>
        </Form>
    )
}

export default Createform
