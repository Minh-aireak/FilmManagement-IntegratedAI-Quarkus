package org.film.management.controller;

import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.film.management.dto.response.ApiResponse;
import org.film.management.service.ImageService;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

@Path("/images")
public class ImageController {

    @Inject
    ImageService imageService;

    @POST
    @Path("/upload")
    @RolesAllowed({"ADMIN", "CUSTOMER"})
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public ApiResponse<String> upload(@RestForm("file") FileUpload file) throws Exception {

        return ApiResponse.<String>builder()
                .result(imageService.upload(file))
                .build();
    }
}
