import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRouter from "@/app/router";
import ScrollManager from "@/app/ScrollManager";
import ApiAccessDeniedToast from "@/shared/ui/ApiAccessDeniedToast";
import { Amplify } from "aws-amplify"
import awsconfig from "@/shared/data/awsAmplifyConfig";
import "./styles/base.css";
import { AuthProvider } from "@/app/providers/AuthProvider";

Amplify.configure(awsconfig);


const AppMain: React.FC = () => {
    return (
        <BrowserRouter>
            <ScrollManager />
            <AuthProvider>
                <AppRouter />
                <ApiAccessDeniedToast />
            </AuthProvider>
        </BrowserRouter>
    );
};

export default AppMain;
