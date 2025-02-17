import { nanoid } from 'nanoid';

export interface FileMetadata {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

class FileSystemService {
  private readonly STORAGE_KEY = 'ai_writer_files';
  
  private files: FileMetadata[] = [];
  
  constructor() {
    this.loadFiles();
  }
  
  private loadFiles() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      this.files = parsed.map((file: any) => ({
        ...file,
        createdAt: new Date(file.createdAt),
        updatedAt: new Date(file.updatedAt)
      }));
    }
  }
  
  private saveFiles() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.files));
  }
  
  getFiles(): FileMetadata[] {
    return [...this.files].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
  
  getFileById(id: string): FileMetadata | undefined {
    return this.files.find(f => f.id === id);
  }
  
  createFile(name: string, content: string = ''): FileMetadata {
    const now = new Date();
    const newFile: FileMetadata = {
      id: nanoid(),
      name,
      content,
      createdAt: now,
      updatedAt: now
    };
    
    this.files.push(newFile);
    this.saveFiles();
    return newFile;
  }
  
  updateFile(id: string, updates: Partial<Omit<FileMetadata, 'id' | 'createdAt'>>): FileMetadata {
    const index = this.files.findIndex(f => f.id === id);
    if (index === -1) throw new Error('File not found');
    
    this.files[index] = {
      ...this.files[index],
      ...updates,
      updatedAt: new Date()
    };
    
    this.saveFiles();
    return this.files[index];
  }
  
  deleteFile(id: string): void {
    const index = this.files.findIndex(f => f.id === id);
    if (index === -1) throw new Error('File not found');
    
    this.files.splice(index, 1);
    this.saveFiles();
  }
}

export const fileSystem = new FileSystemService();
