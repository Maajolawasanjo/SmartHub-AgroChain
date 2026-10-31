import { z } from "zod";

export const emailSchema=z.string().trim().toLowerCase().email().max(254);
export const passwordSchema=z.string().min(8).max(128);
export const phoneSchema=z.string().trim().transform(v=>{
 const compact=v.replace(/[\s()\-]/g,"");
 return compact.startsWith("0") ? `+234${compact.slice(1)}` : compact.startsWith("234")?`+${compact}`:compact;
}).pipe(z.string().regex(/^\+234[789]\d{9}$/));
export const states=["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT - Abuja","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"] as const;
export const signupSchema=z.object({
 role:z.enum(["buyer","farmer"]),
 fullName:z.string().trim().min(2).max(160),
 farmName:z.string().trim().max(160).optional(),
 state:z.string().optional(),
 email:emailSchema, phone:phoneSchema,
 password:passwordSchema,confirmPassword:z.string(),agree:z.literal(true),
}).superRefine((v,ctx)=>{
 if(v.password!==v.confirmPassword) ctx.addIssue({code:"custom",path:["confirmPassword"],message:"Passwords do not match"});
 if(v.role==="farmer" && (!v.farmName || !states.includes(v.state as typeof states[number])))
  ctx.addIssue({code:"custom",path:["state"],message:"Farmer farm name and valid state are required"});
});
