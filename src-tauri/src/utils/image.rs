use image::GenericImageView;

pub const COVER_MAX_WIDTH: u32 = 600;
pub const COVER_MAX_HEIGHT: u32 = 900;
pub const COVER_WEBP_QUALITY: f32 = 75.0;

pub fn encode_cover_webp(image: &image::DynamicImage) -> Result<Vec<u8>, String> {
    let resized_image = resize_image(image, COVER_MAX_WIDTH, COVER_MAX_HEIGHT);
    let rgb_image = resized_image.to_rgb8();
    let (width, height) = rgb_image.dimensions();

    let encoder = webp::Encoder::from_rgb(rgb_image.as_raw(), width, height);
    let webp_data = encoder.encode(COVER_WEBP_QUALITY);
    Ok(webp_data.to_vec())
}

fn resize_image(
    image: &image::DynamicImage,
    max_width: u32,
    max_height: u32,
) -> image::DynamicImage {
    let (width, height) = image.dimensions();

    if width <= max_width && height <= max_height {
        return image.clone();
    }

    let ratio = if width > height {
        max_width as f32 / width as f32
    } else {
        max_height as f32 / height as f32
    };

    let new_width = (width as f32 * ratio).round() as u32;
    let new_height = (height as f32 * ratio).round() as u32;

    image.resize(new_width, new_height, image::imageops::FilterType::Lanczos3)
}
