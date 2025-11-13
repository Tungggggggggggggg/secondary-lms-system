"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  AlertTriangle, 
  Sparkles,
  CheckCircle
} from 'lucide-react';

// Import New Assignment Builder
import NewAssignmentBuilder from './NewAssignmentBuilder';

interface SmartAssignmentBuilderWrapperProps {
  useNewBuilder?: boolean;
}

/**
 * Wrapper Component để migrate từ SmartAssignmentBuilder cũ sang NewAssignmentBuilder
 * Hiển thị migration notice và redirect user sang workflow mới
 */
export default function SmartAssignmentBuilderWrapper({ 
  useNewBuilder = true 
}: SmartAssignmentBuilderWrapperProps) {
  const [showNewBuilder, setShowNewBuilder] = React.useState(useNewBuilder);

  if (showNewBuilder) {
    return <NewAssignmentBuilder />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Migration Notice */}
        <Card className="shadow-lg border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-blue-600" />
              Assignment Builder Đã Được Cải Tiến!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-2">
                    Chúng tôi đã nâng cấp trải nghiệm tạo bài tập!
                  </h3>
                  <p className="text-blue-700 text-sm">
                    Assignment Builder mới được thiết kế lại hoàn toàn với workflow đơn giản hơn, 
                    UI/UX cải tiến và nhiều tính năng mới.
                  </p>
                </div>
              </div>
            </div>

            {/* New Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">✨ Tính năng mới:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Workflow 4 bước đơn giản</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>File upload với Supabase</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Auto-save mỗi 30 giây</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>5 time presets cơ bản</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">🎯 Cải tiến:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>UI/UX chuyên nghiệp hơn</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Context-aware features</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Validation real-time</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Mobile responsive</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Migration Info */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 mb-1">
                    Thông tin quan trọng
                  </h4>
                  <p className="text-yellow-700 text-sm">
                    Assignment Builder cũ sẽ được ngừng hỗ trợ. Tất cả tính năng đã được 
                    chuyển sang phiên bản mới với trải nghiệm tốt hơn.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                onClick={() => setShowNewBuilder(true)}
                className="flex items-center gap-2 flex-1"
                size="lg"
              >
                <Sparkles className="w-5 h-5" />
                Sử dụng Assignment Builder mới
                <ArrowRight className="w-4 h-4" />
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => {
                  // Redirect to old builder (if needed for emergency)
                  window.location.href = '/dashboard/teacher/assignments/legacy';
                }}
                className="flex items-center gap-2"
              >
                Sử dụng phiên bản cũ (không khuyến khích)
              </Button>
            </div>

            {/* Version Info */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Badge variant="outline">v2.0</Badge>
                <span className="text-sm text-gray-600">Assignment Builder mới</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">Deprecated</Badge>
                <span className="text-sm text-gray-600">Assignment Builder cũ</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
