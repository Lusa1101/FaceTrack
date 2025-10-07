import { zip } from 'react-native-zip-archive'

const baseline = "http://10.4.219.166:8000";

export async function getEncoding(url: string) {
    console.log('Reached getEncoding.');

    const formData = JSON.stringify({ url: url });

    const res = await fetch(baseline + '/get_encoding', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: formData,
    });

    try {
        const result = await res.json();

        // iF error
        if(result.error)
            throw result.error;

        console.log('Encoding response:', typeof result.encoding[0]);

        return result;
    } catch (error) {
        console.error(`Error while getting encoding from api: ${error}`);
    }
}

export async function getSimilarity(uri: string, std: {student_no: number, encoding: number[]}[], ids: number[]) {
    try {
        console.log('std:', std);
        console.log('Length:', std?.length);
        const knownEncodings = std.map(x => x.encoding);
        const studentNumbers = std.map(x => x.student_no);

        const formData = new FormData();

        // Get file info to check size
        // const fileInfo = await getFileInfo(uri);
        // if(fileInfo)
        //     console.log('File size:', fileInfo, 'bytes');
        
        // If file is too large, you may want to compress it first
        // For now, we'll proceed and let the backend handle size validation

        // Append the image file
        formData.append('file', {
            uri: uri,
            type: 'image/jpeg',
            name: 'photo.jpg',
        } as any);

        // Append encodings array as JSON string
        console.log("Known encodings: ", ids);
        console.log("Student no", studentNumbers.length);
        formData.append('student_ids', JSON.stringify(ids));
        formData.append('student_no', JSON.stringify(studentNumbers));

        const res = await fetch(baseline + '/get_similarity', {
            method: 'POST',
            body: formData,
        });

        // Check HTTP status first
        if (!res.ok) {
            const errorText = await res.text();
            console.error(`HTTP ${res.status}: ${errorText}`);
            throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        const result = await res.json();

        if (result.error) {
            throw new Error(result.error);
        }

        console.log('Similarity response:', result.name, result.confidence);
        return result;

    } catch (error) {
        console.error(`Error while getting similarity from api: ${error}`);
        throw error;
    }
}

// Helper function to get file info
async function getFileInfo(uri: string) {
    return new Promise(async (resolve, reject) => {
        // For React Native, you might need to use a library like react-native-fs
        if (uri)
        {
            const size = 2;
            return size;
        }

        // This is a simplified version
        resolve({ size: 0 }); // Placeholder
    });
}

export async function getSimilarity1(uri: string, std: {student_no: number, encoding: number[]}[]) {
    console.log('Reached getSimilarity.', std.length);
    console.log('std:', std);
    console.log('Length:', std?.length);

    // Set the variable
    const knownEncodings = std.map(x => x.encoding);
    const studentNumbers = std.map(x => x.student_no);
    console.log("Known encodings: ", knownEncodings.length);
    console.log("Student no", studentNumbers.length);

    const formData = new FormData();

    // Get file extension from URI
    const fileExtension = uri.split('.').pop()?.toLowerCase() || 'jpg';
    console.log('Exnt: ', fileExtension);
    const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';

    formData.append('file', {
        uri: uri,
        type: mimeType,
        name: `photo.${fileExtension}`,
    } as any);

    // Append encodings array as JSON string
    const size = new Blob([JSON.stringify(knownEncodings)]).size
    console.log(`Size of known_faces: ${(size / 1024 / 1024).toFixed(2)}MB`);
    formData.append('known_faces', JSON.stringify(knownEncodings)); // knownEncodings: number[][]

    // Append student numbers array as JSON string
    const size1 = new Blob([JSON.stringify(studentNumbers)]).size
    console.log(`Size of student numbers: ${(size1 / 1024 / 1024).toFixed(2)}MB`);
    formData.append('student_no', JSON.stringify(studentNumbers)); // studentNumbers: number[]

    // Getting similarity
    console.log('Connecting for similarity...');
    const res = await fetch(baseline + '/get_similarity', {
        method: 'POST',
        body: formData,
    });

    // Examining the response
    console.log('Checking the response of similarity...');
    try {
        const result = await res.json();

        // iF error
        if(result.error)
            throw result.error;

        console.log('Similarity response:', result.name, result.confidence);

        return result;
    } catch (error) {
        console.error(`Error while getting similarity from api: ${error}`);
    }
}

export async function getSimilarity2(uri: string, ids: number[]) {
    try {
        console.log('std:', ids.length);

        const formData = new FormData();

        // Append the image file
        formData.append('file', {
            uri: uri,
            type: 'image/jpeg',
            name: 'photo.jpg',
        } as any);

        // Append encodings array as JSON string
        formData.append('student_ids', JSON.stringify(ids));

        const res = await fetch(baseline + '/get_similarity_2', {
            method: 'POST',
            body: formData,
        });

        // Check HTTP status first
        if (!res.ok) {
            const errorText = await res.text();
            console.error(`HTTP ${res.status}: ${errorText}`);
            throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        const result = await res.json();

        if (result.error) {
            throw new Error(result.error);
        }

        console.log('Similarity response:', result.name, result.confidence);
        return result;

    } catch (error) {
        console.error(`Error while getting similarity from api: ${error}`);
        throw error;
    }
}