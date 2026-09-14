import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import swaggerUi from 'swagger-ui-express';
import { appointments, audit, auditLogs, claims, patients, providers, Role, AppointmentStatus, ClaimStatus } from './db/store';
import openapi from '../openapi.json';

const app = express(); app.use(cors()); app.use(express.json());
const secret = process.env.JWT_SECRET || 'demo-secret';
type User = { email:string; role:Role }; type Authed = Request & { user?:User };
const auth = (req:Authed,res:Response,next:NextFunction) => { const token=req.headers.authorization?.replace('Bearer ',''); if (!token) return res.status(401).json({message:'Authentication required'}); try { req.user=jwt.verify(token,secret) as User; next(); } catch { res.status(401).json({message:'Invalid token'}); } };
const role = (...allowed:Role[]) => (req:Authed,res:Response,next:NextFunction) => req.user && allowed.includes(req.user.role) ? next() : res.status(403).json({message:'Insufficient role'});
const page = <T>(items:T[], req:Request) => { const q=String(req.query.q||'').toLowerCase(); const pageNum=Math.max(1,Number(req.query.page||1)); const limit=Math.min(50,Math.max(1,Number(req.query.limit||10))); const filtered=q?items.filter(x=>JSON.stringify(x).toLowerCase().includes(q)):items; return {data:filtered.slice((pageNum-1)*limit,pageNum*limit),pagination:{page:pageNum,limit,total:filtered.length,totalPages:Math.ceil(filtered.length/limit)}}; };

app.get('/health',(_,res)=>res.json({status:'ok',syntheticData:true}));
app.post('/api/auth/login',(req,res)=>{ const email=req.body.email||'demo@northstar.test'; const roleName=(req.body.role||'admin') as Role; const user={email,role:roleName}; res.json({token:jwt.sign(user,secret,{expiresIn:'8h'}),user}); });
app.get('/api/providers',auth,(req,res)=>res.json(page(providers,req)));
app.get('/api/patients',auth,(req,res)=>res.json(page(patients,req)));
app.get('/api/appointments',auth,(req,res)=>{ let data=appointments; if(req.query.status) data=data.filter(a=>a.status===req.query.status); if(req.query.providerId) data=data.filter(a=>a.providerId===req.query.providerId); data=[...data].sort((a,b)=>String(a.startsAt).localeCompare(String(b.startsAt))); res.json(page(data,req)); });
app.post('/api/appointments',auth,role('admin','scheduler'),(req:Authed,res)=>{ const {providerId,patientId,startsAt,endsAt,reason}=req.body; if(!providerId||!patientId||!startsAt||!endsAt||!reason) return res.status(400).json({message:'providerId, patientId, startsAt, endsAt, reason are required'}); const conflict=appointments.some(a=>a.providerId===providerId&&a.status!=='cancelled'&&new Date(startsAt)<new Date(a.endsAt)&&new Date(endsAt)>new Date(a.startsAt)); if(conflict) return res.status(409).json({message:'Provider already has an appointment in this time window'}); const item={id:`apt-${Date.now()}`,providerId,patientId,startsAt,endsAt,status:'scheduled' as AppointmentStatus,reason,createdBy:req.user!.email}; appointments.push(item); audit(req.user!.email,'created','appointment',item.id,{providerId,patientId}); res.status(201).json(item); });
app.patch('/api/appointments/:id/status',auth,role('admin','scheduler'),(req:Authed,res)=>{ const item=appointments.find(a=>a.id===req.params.id); if(!item) return res.status(404).json({message:'Appointment not found'}); item.status=req.body.status as AppointmentStatus; audit(req.user!.email,'status_changed','appointment',item.id,{status:item.status}); res.json(item); });
app.get('/api/claims',auth,(req,res)=>{ let data=claims; if(req.query.status) data=data.filter(c=>c.status===req.query.status); res.json(page(data,req)); });
app.patch('/api/claims/:id/status',auth,role('admin','billing'),(req:Authed,res)=>{ const item=claims.find(c=>c.id===req.params.id); if(!item) return res.status(404).json({message:'Claim not found'}); item.status=req.body.status as ClaimStatus; item.updatedAt=new Date().toISOString(); audit(req.user!.email,'status_changed','claim',item.id,{status:item.status}); res.json(item); });
app.get('/api/audit-logs',auth,role('admin'),(req,res)=>res.json(page(auditLogs,req)));
app.get('/docs',swaggerUi.serve,swaggerUi.setup(openapi));
app.use((err:Error,_req:Request,res:Response,_next:NextFunction)=>res.status(500).json({message:err.message}));
export default app;
