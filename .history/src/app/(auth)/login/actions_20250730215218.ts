"use server"

export const handleLogin = async (formData:FormData)=>{
   const email = formData.get("email")?.toString(); // ← CALL .toString()
   const password = formData.get("password")?.toString();
   
}