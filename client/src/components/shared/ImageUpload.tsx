import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  currentImage?: string;
  onImageChange: (url: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "avatar" | "cover";
}

export function ImageUpload({
  currentImage,
  onImageChange,
  className,
  size = "md",
  variant = "avatar",
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadProgress, setUploadProgress] = useState(0);
  
  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.upload.image(file, (percent) => setUploadProgress(percent)),
    onSuccess: (url) => {
      onImageChange(url);
      setPreview(null);
      setUploadProgress(0);
    },
    onError: () => {
      setUploadProgress(0);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    uploadMutation.mutate(file);
  };

  const clearPreview = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sizeClasses = {
    sm: variant === "avatar" ? "h-16 w-16" : "h-24 w-full",
    md: variant === "avatar" ? "h-24 w-24" : "h-40 w-full",
    lg: variant === "avatar" ? "h-32 w-32" : "h-56 w-full",
  };

  const displayImage = preview || currentImage;

  if (variant === "cover") {
    return (
      <div className={cn("relative", className)}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
          data-testid="input-cover-upload"
        />

        <div
          className={cn(
            "relative rounded-2xl overflow-hidden bg-gray-100",
            sizeClasses[size]
          )}
        >
          {displayImage ? (
            <img
              src={displayImage}
              alt="Cover"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Upload className="h-8 w-8 text-gray-300" />
            </div>
          )}

          {uploadMutation.isPending ? (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white mb-2" />
              {uploadProgress > 0 && (
                <>
                  <span className="text-sm text-white font-medium">{uploadProgress}%</span>
                  <div className="w-24 h-1.5 bg-white/30 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-white/90 p-3 hover:bg-white transition-colors"
                disabled={uploadMutation.isPending}
                data-testid="button-upload-cover"
              >
                <Camera className="h-5 w-5 text-gray-700" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-image-upload"
      />

      <div
        className={cn(
          "relative rounded-full overflow-hidden bg-gray-100",
          sizeClasses[size]
        )}
      >
        {displayImage ? (
          <img
            src={displayImage}
            alt="Profile"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Camera className="h-8 w-8 text-gray-300" />
          </div>
        )}

        <AnimatePresence>
          {uploadMutation.isPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1"
            >
              <Loader2 className="h-6 w-6 animate-spin text-white" />
              {uploadProgress > 0 && (
                <span className="text-xs text-white font-medium">{uploadProgress}%</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="absolute bottom-0 right-0 rounded-full bg-primary p-2 shadow-lg hover:bg-primary/90 transition-colors"
        disabled={uploadMutation.isPending}
        data-testid="button-upload-image"
      >
        <Camera className="h-4 w-4 text-white" />
      </button>

      {uploadMutation.isError && (
        <p className="text-xs text-red-500 mt-2 text-center">
          Failed to upload image
        </p>
      )}
    </div>
  );
}
