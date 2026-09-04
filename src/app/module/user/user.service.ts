import cloudinary from "../../lib/cloudinary"

const uploadProfileImage = async(buffer : Buffer)=>{
    const cloudinaryResult =  cloudinary.uploader.upload_stream({resource_type : "auto"}, (error, result)=>{
        if(error){
            console.log(error.message);
            throw new Error(error.message);
        }

        console.log(result?.secure_url);
        console.log(result);
    }).end(buffer)
}

export const UserServices = {
    uploadProfileImage
}