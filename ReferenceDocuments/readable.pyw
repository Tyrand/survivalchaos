import os,re,json,threading,tkinter as tk;from tkinter import ttk,scrolledtext,messagebox;from tkinterdnd2 import DND_FILES,TkinterDnD
class ProductionCleaner:
 def __init__(self,root):
  self.root=root;self.root.title("Enterprise Data Purge Engine");self.root.geometry("800x600");self.cfg_path="cleaner_config.json";self.stats={"files":0,"bytes_saved":0};self.load_config();self.build_ui()
 def load_config(self):
  if os.path.exists(self.cfg_path):
   try:
    with open(self.cfg_path,"r") as f:self.cfg=json.load(f)
   except:self.get_default_cfg()
  else:self.get_default_cfg()
 def get_default_cfg(self):self.cfg={"regex":r"\b[a-z]{4}\s+|ReplaceableTextures\\[a-zA-Z0-9\\]+\.[a-z]{3}\b","sub_dir":"cleaned_output","backup":False,"overwrite":False}
 def save_config(self):
  self.cfg["regex"]=self.regex_entry.get();self.cfg["sub_dir"]=self.dir_entry.get();self.cfg["backup"]=bool(self.backup_var.get());self.cfg["overwrite"]=bool(self.overwrite_var.get())
  with open(self.cfg_path,"w") as f:json.dump(self.cfg,f)
 def build_ui(self):
  bg_col,fg_col="#2e2e2e","#ffffff";self.root.configure(bg=bg_col);style=ttk.Style();style.theme_use("clam");style.configure(".",background=bg_col,foreground=fg_col);style.configure("TLabel",background=bg_col,foreground=fg_col)
  main_frame=tk.Frame(self.root,bg=bg_col);main_frame.pack(fill=tk.BOTH,expand=True,padx=10,pady=10);left_panel=tk.LabelFrame(main_frame,text=" Engine Configuration ",bg=bg_col,fg=fg_col);left_panel.pack(side=tk.LEFT,fill=tk.BOTH,padx=5,pady=5,expand=False)
  tk.Label(left_panel,text="Target Regex Pattern:",bg=bg_col,fg=fg_col).pack(anchor=tk.W,padx=5,pady=2);self.regex_entry=tk.Entry(left_panel,width=35);self.regex_entry.insert(0,self.cfg["regex"]);self.regex_entry.pack(fill=tk.X,padx=5,pady=2)
  tk.Label(left_panel,text="Output Subdirectory:",bg=bg_col,fg=fg_col).pack(anchor=tk.W,padx=5,pady=2);self.dir_entry=tk.Entry(left_panel,width=35);self.dir_entry.insert(0,self.cfg["sub_dir"]);self.dir_entry.pack(fill=tk.X,padx=5,pady=2)
  self.backup_var=tk.IntVar(value=1 if self.cfg["backup"] else 0);tk.Checkbutton(left_panel,text="Create Backups (.bak)",variable=self.backup_var,bg=bg_col,fg=fg_col,selectcolor=bg_col).pack(anchor=tk.W,padx=5,pady=2)
  self.overwrite_var=tk.IntVar(value=1 if self.cfg.get("overwrite",False) else 0);tk.Checkbutton(left_panel,text="Overwrite Original Files",variable=self.overwrite_var,bg=bg_col,fg=fg_col,selectcolor=bg_col).pack(anchor=tk.W,padx=5,pady=2)
  tk.Button(left_panel,text="Save Profile",command=self.save_config,bg="#4a4a4a",fg="#ffffff").pack(fill=tk.X,padx=5,pady=5);stat_frame=tk.LabelFrame(left_panel,text=" Analytics ",bg=bg_col,fg=fg_col);stat_frame.pack(fill=tk.BOTH,expand=True,padx=5,pady=5)
  self.lbl_f_count=tk.Label(stat_frame,text="Files Processed: 0",bg=bg_col,fg=fg_col);self.lbl_f_count.pack(anchor=tk.W,padx=5,pady=2);self.lbl_b_saved=tk.Label(stat_frame,text="Reduced: 0 B",bg=bg_col,fg=fg_col);self.lbl_b_saved.pack(anchor=tk.W,padx=5,pady=2)
  tk.Button(stat_frame,text="Open Output Folder",command=self.open_output_dir,bg="#4a4a4a",fg="#ffffff").pack(side=tk.BOTTOM,fill=tk.X,padx=5,pady=5);right_panel=tk.LabelFrame(main_frame,text=" Live Console Logs ",bg=bg_col,fg=fg_col);right_panel.pack(side=tk.RIGHT,fill=tk.BOTH,expand=True,padx=5,pady=5)
  search_frame=tk.Frame(right_panel,bg=bg_col);search_frame.pack(fill=tk.X,padx=5,pady=2);tk.Label(search_frame,text="Filter Logs:",bg=bg_col,fg=fg_col).pack(side=tk.LEFT,padx=2);self.search_entry=tk.Entry(search_frame);self.search_entry.pack(side=tk.LEFT,fill=tk.X,expand=True,padx=2);self.search_entry.bind("<KeyRelease>",self.filter_logs)
  self.log=scrolledtext.ScrolledText(right_panel,state='disabled',wrap=tk.WORD,bg="#1e1e1e",fg="#85c46c");self.log.pack(fill=tk.BOTH,expand=True,padx=5,pady=5);self.progress=ttk.Progressbar(right_panel,mode='determinate');self.progress.pack(fill=tk.X,padx=5,pady=5)
  self.root.drop_target_register(DND_FILES);self.root.dnd_bind('<<Drop>>',self.handle_drop);self.log_msg("SYSTEM: Framework initialised. Drop target files here.")
 def log_msg(self,msg):
  self.log.config(state='normal');self.log.insert(tk.END,msg+"\n");self.log.see(tk.END);self.log.config(state='disabled');self.all_logs=self.log.get("1.0",tk.END)
 def filter_logs(self,event):
  query=self.search_entry.get().lower();self.log.config(state='normal');self.log.delete("1.0",tk.END)
  for line in self.all_logs.split("\n"):
   if query in line.lower():self.log.insert(tk.END,line+"\n")
  self.log.config(state='disabled')
 def open_output_dir(self):
  d=self.dir_entry.get()
  if os.path.exists(d):os.startfile(d) if hasattr(os,'startfile') else os.system(f'xdg-open "{d}"')
  else:messagebox.showwarning("System Error","Output directory missing.")
 def handle_drop(self,event):
  files=self.root.tk.splitlist(event.data);threading.Thread(target=self.batch_process,args=(files,),daemon=True).start()
 def batch_process(self,file_paths):
  total=len(file_paths);self.progress['maximum']=total;self.progress['value']=0;out_dir=self.dir_entry.get();os.makedirs(out_dir,exist_ok=True);regex_pat=self.regex_entry.get();qwerty=set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~")
  for idx,p in enumerate(file_paths):
   p=p.strip('{}')
   if not os.path.isfile(p):continue
   try:
    self.root.after(0,lambda path=p:self.log_msg(f"PARSING: {os.path.basename(path)}"))
    with open(p,'r',errors='ignore') as f:orig=f.read()
    orig_len=len(orig);cleaned=orig.replace('\x00','');cleaned=re.sub(r'\|[nN]','\n',cleaned);cleaned=re.sub(r'\|[cC][0-9a-fA-F]{8}','',cleaned);cleaned=re.sub(r'\|[rR]','',cleaned);lines=cleaned.split('\n');cleaned_lines=[]
    for line in lines:
     line=re.sub(regex_pat,' ',line);line="".join(c for c in line if c in qwerty)
     if not line.strip():continue
     cleaned_lines.append(line)
    cleaned='\n'.join(cleaned_lines);saved_bytes=max(0,orig_len-len(cleaned))
    if self.backup_var.get():
     with open(p+".bak",'w',errors='ignore') as f:f.write(orig)
    t_name=p if self.overwrite_var.get() else os.path.join(out_dir,os.path.basename(p))
    with open(t_name,'w',errors='ignore') as f:f.write(cleaned)
    self.stats["files"]+=1;self.stats["bytes_saved"]+=saved_bytes;self.root.after(0,self.update_stats_ui);self.root.after(0,lambda n=t_name:self.log_msg(f"SUCCESS: Saved -> {n}"))
   except Exception as err:self.root.after(0,lambda e=str(err):self.log_msg(f"ERROR: {e}"))
   self.root.after(0,lambda:self.progress.step(1))
 def update_stats_ui(self):
  self.lbl_f_count.config(text=f"Files Processed: {self.stats['files']}");b=self.stats["bytes_saved"]
  for unit in ['B','KB','MB','GB']:
   if b<1024:break
   b/=1024
  self.lbl_b_saved.config(text=f"Reduced: {b:.2f} {unit}")
if __name__=="__main__":
 root=TkinterDnD.Tk();app=ProductionCleaner(root);root.mainloop()