import client from '@/lib/db'
import { inngest } from './client'
import { ObjectId } from 'mongodb'

import { GoogleGenerativeAI } from '@google/generative-ai'

import { modelUsed } from '@/constants/constants'
import {
    buildQnA,
    answeredCount,
    sanitizeInsights,
    NO_ANSWER,
} from '@/lib/insightsSanitizer'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

export const helloWorld = inngest.createFunction(
    {
        id: 'hello-world'
    },
    {
        event: 'text/hello-world'
    },
    async ({ event, step }) => {
        await step.sleep('wait-a-moment', '1s')
        return { message: `Hello ${event.data.email}` }
    }
)

export const createQuestions = inngest.createFunction(
    {
        id: 'create-questions'
    },
    {
        event: 'app/create-questions'
    },
    async ({ event, step }) => {
        const { id } = event.data
        console.log("create inngest",id)
        

        const db = client.db()
        
        const interview = await db.collection("interviews").findOne({ _id: new ObjectId(id) })
        

        // const prompt = `Suppose you are an interviewer from the company : ${interview?.jobTitle} and you have to take an interview for the role of : ${interview?.jobDesc} which has the job Decription about the role as :${interview?.jobDesc}. The candidate has the following skills : ${interview?.skills?.map((skill: string) => skill).join(", ")} . The candidate has same projects whose description are : ${interview?.projectContext?.map((project: string) => project).join(", ")}. and the candidate also has a Work experience which is : ${interview?.workExDetails?.map((work: string) => work).join(", ")}. Now based of this information you have to generate 5 questions that are not more than 200 words to test the candidate around the given company and the given role. And also give the answer which is most apt answer according to you for that question. give it the format or an array of object of type: 

        // {

        //     question:"",
        //     expectedAnswer:""
        // }
        //     ONLY JSON CONTENT NO EXTRA CONTENT IS TO BE PRODUCED.

        //     IF THERE IS ANY ISSUE FOR YOU TO GENERATE THE ANSWERS JUST RETURN AN EMPTY ARRAY JSON BUT NEVER RETURN ANY TEXT WITHOUT JSON.
            
        // `

        const prompt = `
        You are an interviewer from the company: ${interview?.jobTitle}. 
        Your task is to create an interview for the role: ${interview?.jobDesc}. 

        The job description for this role is: ${interview?.jobDesc}.  
        The candidate has the following skills: ${interview?.skills?.join(", ")}.  
        The candidate has the following project descriptions: ${interview?.projectContext?.join(", ")}.  
        The candidate’s work experience is: ${interview?.workExDetails?.join(", ")}.  

        Using this information:
        1. Generate exactly **5** medium-level interview questions to evaluate the candidate’s suitability for **this company** and **this role**.  
        2. Each question should be concise but relevant to the provided skills, projects, work experience, and job description.  
        3. Provide the **most apt answer** you think a strong candidate would give.  
        4. The **total** of all questions and answers combined must not exceed **200 words**.  

        Output Format:
        Return ONLY a valid JSON array of objects in this exact structure (no extra text, comments, or formatting):

        [
        {
            "question": "string",
            "expectedAnswer": "string"
        }
        ]

        If you cannot generate the answers for any reason, return an **empty JSON array**: []
        Do not include any content other than the JSON.
        `


        const model = await genAI.getGenerativeModel({
            model: modelUsed,
            generationConfig: {
                temperature: 0.9,
                responseMimeType:'application/json'
            }
        })

        

        let extracted;
        console.log('LLM Generated text!')

        try {
            const result = await model.generateContent(prompt)
        const text = (await result).response.text()
            const cleaned = text.replace(/```json\s*([\s\S]*?)\s*```/, '$1').trim();
            extracted = JSON.parse(cleaned)
        } catch (error) {
            console.error('Caught error:', error);
            return { message: 'Error Occured',error:error }
        }
        console.log('Text Converted to JSON!')

        const queDb = await db.collection("questions").insertOne({
            questions: extracted,
            answers: [],
            interviewId: id,
        })

        const inte = await db.collection("interviews").findOneAndUpdate(
            { _id: new ObjectId(id) },
            {
                $set: {
                    questions: queDb.insertedId
                }
            }
        );

        // console.log(prompt)
        await step.sleep('wait', '4s')
        return { questions: extracted, queDBId: queDb }
    }
)

export const generateInsights = inngest.createFunction(
    {id:'genrate-insights'},
    {event:'app/generateInsights'},
   async ({event,step})=>{

    const {interviewId} = event.data
    const objId = new ObjectId(interviewId)
    console.log("iske liye",interviewId)

    const db = client.db();
    // await step.sleep('wait', '2s')

    const questionsDoc = await db.collection("questions").findOne({interviewId:interviewId})

    // Driven by the questions, not the answers array. The old loop used
    // `answers.length`, so a short answers array silently dropped questions and
    // a missing one threw. Unanswered questions get an explicit sentinel.
    const qnaArr = buildQnA(
        questionsDoc?.questions ?? [],
        questionsDoc?.answers ?? [],
    )

    // Nothing was answered — there is nothing to grade. Skip the LLM entirely
    // rather than paying for a call that can only invent a score.
    if (answeredCount(qnaArr) === 0) {
        const extracted = sanitizeInsights({}, qnaArr)
        await db.collection("questions").findOneAndUpdate(
            { interviewId: interviewId },
            { $set: { extracted } },
        )
        return { message: 'No answers recorded, scored as zero' }
    }

    // console.log(questionsDoc)

    
//     const prompt = `Suppose you are an STRICT scrorer who has to score a candidate and generate a report on following parameters given as :
    
//     1. Depth of Knowledge

//     This insight assesses a candidate's ability to move beyond theoretical knowledge. A high score shows they can discuss specific implementation details, trade-offs, and how to design solutions around a technology's limitations, demonstrating practical, real-world experience rather than just a textbook understanding. 

//     2. Impact-Oriented Mindset

//     This insight evaluates a candidate's focus on the business value of their work. A strong candidate quantifies their achievements using specific metrics (like Lighthouse scores) and clearly explains how their technical decisions translated into tangible benefits for the user experience, company, or team.

//     3. Architectural Flexibility

//     This insight measures a candidate's adaptability to complex, modern system designs. It tests their understanding of advanced patterns like micro-frontends and microservices, and their ability to apply core software engineering principles to new and challenging distributed environments.

//     4. Problem-Solving and Debugging Skills

//     This insight assesses a candidate's methodical approach to resolving technical issues. A high score indicates a systematic, logical process for debugging, including the ability to use specific tools, form hypotheses, and test them, rather than relying on a vague, unstructured approach.

//     5. Collaboration and Communication

//     This insight evaluates a candidate's effectiveness in a team. It focuses on their understanding of collaborative practices like writing clean, testable code, documenting APIs, and making technical decisions that benefit the long-term maintainability and success of a project for all team members.

//     Dont do linient marking. If user gives the same question copy pasted then give zero as well. You have to be realistic


//     You will be given the questions that were asked, what would have been the expectedAnswer and what are the actual answers. 

//     The array of objects of which you have you judge would be consisting of objects which has is like 
//     {
//     question:",
//     expectedAnswer:"",
//     answer:""
//     }

    

//     The QUESTIONS GIVEN TO YOU ARE  : [
//     ${qnaArr.map((qna)=>JSON.stringify(qna)).join(", ")}
//     ]

//     NOW FOR THIS ARRAY OF QUESTIONS, EXPECTED ANSWERS AND ANSWERS GENERATE THE FOLLOWING : 



//     1. Overall Score out of 10 for the candidate for this answers

//     2. Scores of the above 5 parameters out of 10

//     3. Brief advice of what could have been improved in each question in 100 words only(THE QUESTION WOULD BE FROM THE GIVEN QUESTIONS ARRAY ONLY!!)

//     4. And an overall verdict for the candidate in 50 words.

//     Output json should be THIS AND ONLY THIS FOMAT IN JSON
//     extracted:{
//     overallScore:number,
//     parameterScores:{
//     depthOfKnowledge:number,
//     impactOrientedMindset:number,
//     architecturalFlexibility:number,
//     problemSolvingAndDebuggingSkills:number,
//     collaborationAndCommunication:number
//     },
//     adviceForImprovement:[
//     {
//     question:string,
//     advice:string
//     }
//     ],
//     overallVerdict
//     }
// Object
// overallScore
// 7.5

// parameterScores
// Object
// depthOfKnowledge
// 7
// impactOrientedMindset
// 6.5
// architecturalFlexibility
// 8
// problemSolvingAndDebuggingSkills
// 8
// collaborationAndCommunication
// 8

// adviceForImprovement
// Array (5)
// overallVerdict


    

//     RETURN ONLY JSON CONTENT NO EXTRA CONTENT IS TO BE GIVEN BACK.

//     ONLY JSON CONTENT NO EXTRA CONTENT IS TO BE PRODUCED.
//     `
        const prompt = `
        You are a STRICT evaluator who must score a candidate's answers and generate a report on the following 5 parameters:

        1. **Depth of Knowledge**  
        Measures ability to go beyond theory, discussing implementation details, trade-offs, and designing solutions within technology limitations. High scores reflect real-world experience.

        2. **Impact-Oriented Mindset**  
        Evaluates focus on business value. Strong candidates quantify achievements with metrics (e.g., Lighthouse scores) and link technical decisions to tangible benefits.

        3. **Architectural Flexibility**  
        Assesses adaptability to modern, complex systems, understanding of patterns (micro-frontends, microservices), and applying core software engineering principles in distributed environments.

        4. **Problem-Solving and Debugging Skills**  
        Looks at systematic, logical debugging with clear hypotheses, testing, and specific tool usage, avoiding vague/unstructured approaches.

        5. **Collaboration and Communication**  
        Judges team effectiveness, clean/testable code, API documentation, and long-term maintainability-focused decisions.

        **Marking Rules:**  
        - Do not be lenient.  
        - If the candidate’s answer is a direct copy-paste of the expected answer, score it **0**.  
        - Be realistic in scoring.

        **CRITICAL — read carefully:**
        - The \`expectedAnswer\` field is a reference for YOU. It is NOT something the candidate said. Never score the candidate as if they produced the expected answer.
        - Score ONLY the text in the \`answer\` field.
        - If \`answer\` is exactly \`${NO_ANSWER}\`, the candidate said nothing. That question scores **0**, and it must drag the overall score down. Do not invent content for it and do not give it credit.
        - EVERY score you output — overallScore, each of the 5 parameters, and each per-question score — MUST be between 0 and 10 inclusive. Never output a value above 10 under any circumstance.

        ---

        **You will be provided**:  
        An array of objects in this structure:  
        \`\`\`json
        {
        "question": "string",
        "expectedAnswer": "string",
        "answer": "string"
        }
        \`\`\`

        **Given Data:**  
        \`\`\`json
        [
        ${qnaArr.map((qna) => JSON.stringify(qna)).join(", ")}
        ]
        \`\`\`

        ---

        **Your task:** For the given array of questions, expected answers, and actual answers, produce:

        1. **Overall Score** (0–10) for the candidate based on the answers matching of athe expected and actual on how close the answer were, dont give random scores it shoudl be calculated from the below given parameters.  
        2. **Scores for each of the 5 parameters** (0–10).  
        3. **Advice for improvement** (max 100 words per question) for **each question in the given array**.  
        4. **Overall verdict** (max 50 words).  
        5. **A score out of 10 for EACH question**, in the same order as the given array. This powers a per-question breakdown, so the array length must exactly match the number of questions given.  

        ---

        **STRICT OUTPUT FORMAT:**  
        Return ONLY a valid JSON object in the following structure — no extra text, explanations, or formatting outside JSON:

        \`\`\`json
        
        {
            "overallScore": number,
            "parameterScores": {
            "depthOfKnowledge": number,
            "impactOrientedMindset": number,
            "architecturalFlexibility": number,
            "problemSolvingAndDebuggingSkills": number,
            "collaborationAndCommunication": number
            },
            "adviceForImprovement": [
            {
                "question": "string",
                "advice": "string"
            }
            ],
            "perQuestionScores": [
            {
                "question": "string",
                "score": number
            }
            ],
            "overallVerdict": "string"
        }
        
        \`\`\`

        If you cannot generate a result, return an **empty JSON object**:  
        \`\`\`json
        {}
        \`\`\`
        `


     const model = genAI.getGenerativeModel({
            model: modelUsed,
            generationConfig: {
                temperature: 0.9,
                responseMimeType:'application/json'
            }
        })

        const result = model.generateContent(prompt)
        const text = (await result).response.text()

        // console.log(prompt)

        let extracted;

        try {
            const cleaned = text.replace(/```json\s*([\s\S]*?)\s*```/, '$1').trim();
            extracted = JSON.parse(cleaned)
        } catch (error) {
            console.log(error)
            return { message: 'Error Occured' }
        }

        // console.log("extr",extracted)

        // Model output is untrusted input. Clamp every score into 0-10, force
        // unanswered questions to 0, and align the arrays to the questions we
        // actually asked. Without this a hallucinated 15 was stored verbatim
        // and rendered to the user as "15/10".
        const safeExtracted = sanitizeInsights(extracted, qnaArr)

        const qid = await db.collection("questions").findOneAndUpdate(
            {interviewId:interviewId},
            {
                $set:{
                   extracted: safeExtracted
                }
            }
        )
        // console.log("qis",qid)

        await step.sleep('wait', '4s')
        return {message:'Statistics Generated',queDB:qid?._id}

   }
)

